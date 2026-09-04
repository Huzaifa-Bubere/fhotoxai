import os
import subprocess
import logging
from typing import Optional
from ai_api.config import SMTP_SERVER, SMTP_PORT, MAIL_USERNAME, MAIL_PASSWORD

logger = logging.getLogger("notification_service")

AI_API_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.dirname(AI_API_DIR)
GENERAL_API_DIR = os.path.join(BACKEND_DIR, "general_api")

class NotificationService:
    _email_runtime_checked = False
    _email_runtime_available = False

    @classmethod
    def _has_email_runtime(cls) -> bool:
        if not cls._email_runtime_checked:
            cls._email_runtime_checked = True
            cls._email_runtime_available = os.path.exists(
                os.path.join(BACKEND_DIR, "node_modules", "nodemailer")
            )
            if not cls._email_runtime_available:
                logger.warning(
                    "Email notifications disabled because backend/node_modules/nodemailer is missing. "
                    "Run `npm install` in backend to enable email sending."
                )
        return cls._email_runtime_available

    @classmethod
    def _run_node_script(cls, args):
        if not cls._has_email_runtime():
            return None

        return subprocess.run(
            args,
            capture_output=True,
            text=True,
            encoding='utf-8',
            cwd=BACKEND_DIR,
        )

    @staticmethod
    def send_photographer_invitation(email: str, event_name: str, event_link: str):
        try:
            separator = "&" if "?" in event_link else "?"
            event_link = f"{event_link}{separator}email={email}"
            
            script_path = os.path.join(GENERAL_API_DIR, "photographer_notification.js")
            subject = f"Invitation: Photographer for {event_name}"
            result = NotificationService._run_node_script(
                ["node", script_path, email, subject, event_name, event_link]
            )
            if result is None:
                return
            if result.returncode == 0:
                logger.info(f"Photographer notification sent to {email}")
            else:
                logger.error(f"Failed to send photographer notification: {result.stderr}")
        except Exception as e:
            logger.error(f"Error in photographer notification: {e}")

    @staticmethod
    def send_organizer_upload_complete(email: str, event_name: str, photographer_name: str, dashboard_url: str):
        try:
            separator = "&" if "?" in dashboard_url else "?"
            dashboard_url = f"{dashboard_url}{separator}email={email}"
            
            script_path = os.path.join(GENERAL_API_DIR, "organizer_notification.js")
            subject = f"Upload Complete: {event_name}"
            result = NotificationService._run_node_script(
                ["node", script_path, email, subject, event_name, photographer_name, dashboard_url]
            )
            if result is None:
                return
            if result.returncode == 0:
                logger.info(f"Organizer notification sent to {email}")
            else:
                logger.error(f"Failed to send organizer notification: {result.stderr}")
        except Exception as e:
            logger.error(f"Error in organizer notification: {e}")

    @staticmethod
    def send_guest_invitation(email: str, event_name: str, event_id: int, registration_url_base: str, qr_code_path: Optional[str] = None):
        try:
            script_path = os.path.join(GENERAL_API_DIR, "invitation_service.js")
            subject = f"You are invited to {event_name}"
            # Construct registration URL correctly
            # registration_url_base is https://events.digitalnexusai.com
            registration_url = f"{registration_url_base}/attendee-registration?eventId={event_id}&email={email}"
            
            logger.info(f"Generated Invitation URL: {registration_url}")
                        
            args = ["node", script_path, email, subject, event_name, registration_url]
            if qr_code_path:
                relative_path = qr_code_path.lstrip('/').lstrip('\\')
                full_qr_path = os.path.join(BACKEND_DIR, relative_path)
                
                if not os.path.exists(full_qr_path):
                     logger.warning(f"QR code file not found at {full_qr_path}, trying ai_api-relative path...")
                     fallback_qr_path = os.path.join(AI_API_DIR, relative_path)
                     if os.path.exists(fallback_qr_path):
                         full_qr_path = fallback_qr_path

                logger.info(f"Using QR code path: {full_qr_path}")
                args.append(full_qr_path)

            result = NotificationService._run_node_script(args)
            if result is None:
                return
            if result.returncode == 0:
                logger.info(f"Guest invitation sent to {email}")
            else:
                logger.error(f"Failed to send guest invitation: {result.stderr}")
        except Exception as e:
            logger.error(f"Error in guest invitation: {e}")

    @staticmethod
    def send_otp_email(email: str, otp: str):
        try:
            script_path = os.path.join(GENERAL_API_DIR, "mail_service.js")
            subject = f"Event Access Code: {otp}"
            result = NotificationService._run_node_script(
                ["node", script_path, email, subject, otp]
            )
            if result is None:
                return False
            return result.returncode == 0
        except Exception as e:
            logger.error(f"Error sending OTP email: {e}")
            return False

    @staticmethod
    def send_organizer_processing_complete(email: str, event_name: str, dashboard_url: str):
        try:
            separator = "&" if "?" in dashboard_url else "?"
            dashboard_url = f"{dashboard_url}{separator}email={email}"
            
            script_path = os.path.join(AI_API_DIR, "completion_service.js")
            result = NotificationService._run_node_script(
                ["node", script_path, email, event_name, dashboard_url]
            )
            if result is None:
                return
            if result.returncode == 0:
                logger.info(f"Organizer processing completion email sent to {email}")
            else:
                logger.error(f"Failed to send organizer processing notification: {result.stderr}")
        except Exception as e:
            logger.error(f"Error in organizer processing notification: {e}")

    @staticmethod
    def send_attendee_processing_complete(email: str, attendee_name: str, event_name: str, dashboard_url: str, has_matches: bool):
        try:
            separator = "&" if "?" in dashboard_url else "?"
            dashboard_url = f"{dashboard_url}{separator}email={email}"
            
            script_path = os.path.join(AI_API_DIR, "attendee_notification.js")
            result = NotificationService._run_node_script(
                ["node", script_path, email, attendee_name, event_name, dashboard_url, str(has_matches).lower()]
            )
            if result is None:
                return
            if result.returncode == 0:
                logger.info(f"Attendee processing completion email sent to {email}")
            else:
                logger.error(f"Failed to send attendee processing notification: {result.stderr}")
        except Exception as e:
            logger.error(f"Error in attendee processing notification: {e}")

    @staticmethod
    def send_event_creation_confirmation(email: str, event_name: str, date: str, time: str, location: str, dashboard_url: str):
        try:
            separator = "&" if "?" in dashboard_url else "?"
            dashboard_url = f"{dashboard_url}{separator}email={email}"
            
            script_path = os.path.join(GENERAL_API_DIR, "event_creation_notification.js")
            result = NotificationService._run_node_script(
                ["node", script_path, email, event_name, date, time, location, dashboard_url]
            )
            if result is None:
                return
            if result.returncode == 0:
                logger.info(f"Event creation confirmation email sent to {email}")
            else:
                logger.error(f"Failed to send event creation confirmation: {result.stderr}")
        except Exception as e:
            logger.error(f"Error in event creation confirmation: {e}")

# Singleton instance
notification_service = NotificationService()
