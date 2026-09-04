import os
import json
import time
import threading
import logging
from datetime import datetime
import boto3
from botocore.exceptions import ClientError

from ai_api.config import AWS_SQS_QUEUE_URL
from ai_api.database import execute_insert
from ai_api.services.training_service import training_service

logger = logging.getLogger("sqs_worker")

class SQSWorker:
    def __init__(self):
        self.queue_url = AWS_SQS_QUEUE_URL
        self.sqs = boto3.client(
            'sqs',
            region_name=os.getenv('AWS_REGION', 'ap-south-1'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        self.running = False
        self.thread = None

    def start(self):
        if not self.running:
            self.running = True
            logger.info(f"Starting SQS worker polling against {self.queue_url}")
            self.thread = threading.Thread(target=self._poll_queue, daemon=True)
            self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)

    def _poll_queue(self):
        while self.running:
            try:
                response = self.sqs.receive_message(
                    QueueUrl=self.queue_url,
                    MaxNumberOfMessages=1,
                    WaitTimeSeconds=20  # Long polling
                )
                logger.info(f"Received SQS message: {response}")

                messages = response.get('Messages', [])
                for message in messages:
                    self._process_message(message)

            except ClientError as e:
                logger.error(f"AWS SQS ClientError: {e}")
                time.sleep(10)  # Wait before retrying on error
            except Exception as e:
                logger.error(f"Error polling SQS: {e}", exc_info=True)
                time.sleep(5)

    def _process_message(self, message):
        receipt_handle = message.get('ReceiptHandle')
        body = message.get('Body')
        
        try:
            logger.info(f"Received SQS message: {body[:100]}...")
            data = json.loads(body)
            
            # Extract event_id and admin_id from the JSON payload
            event_id = data.get('event_id') or data.get('eventId')
            admin_id = data.get('admin_id') or data.get('adminId') or 1
            training_job_id = data.get('training_job_id')
            
            if not event_id:
                logger.error("SQS message missing 'event_id'. Skipping.")
                self._delete_message(receipt_handle)
                return

            event_id = int(event_id)
            admin_id = int(admin_id)

            logger.info(f"Triggering clustering for event {event_id} by admin {admin_id}")
            
            # Use provided training_job_id from general_api, or create one for backward compatibility
            if training_job_id:
                training_job_id = int(training_job_id)
            else:
                training_job_id = execute_insert(
                    "INSERT INTO training_jobs (event_id, admin_id, status, progress, started_at) VALUES (%s, %s, %s, %s, %s)",
                    (event_id, admin_id, 'queued', 0, datetime.now())
                )
            
            # Run the training task (This runs synchronously in this worker thread)
            # This is desirable so we don't pick up multiple messages and OOM the container
            try:
                training_service.process_training_job(training_job_id, event_id)
            except Exception as e:
                logger.error(f"Training job {training_job_id} failed: {e}", exc_info=True)

            # Delete the message after successfully processing (or failing in a handled way)
            self._delete_message(receipt_handle)

        except json.JSONDecodeError:
            logger.error("Failed to parse SQS message JSON body. Deleting invalid message.")
            self._delete_message(receipt_handle)
        except Exception as e:
            logger.error(f"Error processing SQS message: {e}", exc_info=True)
            # Do NOT delete message if we crashed unexpectedly, allowing it to be retried
            
    def _delete_message(self, receipt_handle):
        try:
            self.sqs.delete_message(
                QueueUrl=self.queue_url,
                ReceiptHandle=receipt_handle
            )
            logger.info("Successfully deleted processed message from SQS.")
        except Exception as e:
            logger.error(f"Failed to delete SQS message: {e}")

sqs_worker = SQSWorker()
