import os
import boto3
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger("s3_service")

# Will initialize client lazily or on first use to allow env vars to load
s3_client = None

def get_s3_client():
    global s3_client
    if s3_client is None:
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
                region_name=os.environ.get('AWS_REGION', 'ap-south-1')
            )
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
    return s3_client

def upload_file_to_s3(file_obj, bucket, object_name, content_type=None):
    """
    Upload a file-like object to an S3 bucket

    :param file_obj: File-like object to upload
    :param bucket: Bucket to upload to
    :param object_name: S3 object name (e.g. 'uploads/event_1/uuid.jpg')
    :param content_type: MIME type of the file
    :return: True if file was uploaded, else False
    """
    client = get_s3_client()
    if not client:
        logger.error("S3 client not initialized. Cannot upload.")
        return False
        
    try:
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
            
        # Ensure file pointer is at the start
        file_obj.seek(0)
        
        client.upload_fileobj(
            file_obj, 
            bucket, 
            object_name,
            ExtraArgs=extra_args
        )
        return True
    except ClientError as e:
        logger.error(f"S3 Upload failed for {object_name}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error uploading to S3 {object_name}: {e}")
        return False

def delete_file_from_s3(bucket, object_name):
    """
    Delete a file from an S3 bucket
    
    :param bucket: Bucket to delete from
    :param object_name: S3 object name
    :return: True if successful, else False
    """
    client = get_s3_client()
    if not client:
        logger.error("S3 client not initialized. Cannot delete.")
        return False
        
    try:
        client.delete_object(Bucket=bucket, Key=object_name)
        return True
    except ClientError as e:
        logger.error(f"S3 Delete failed for {object_name}: {e}")
        return False

def delete_folder_from_s3(bucket, prefix):
    """
    Delete all files with a given prefix (acts like a folder delete)
    
    :param bucket: Bucket to delete from
    :param prefix: Folder prefix (e.g. 'uploads/event_1/Party_Pics/')
    :return: True if successful, else False
    """
    client = get_s3_client()
    if not client:
        logger.error("S3 client not initialized. Cannot delete folder.")
        return False
        
    try:
        paginator = client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
        
        delete_us = dict(Objects=[])
        for item in pages.search('Contents'):
            if item:
                delete_us['Objects'].append(dict(Key=item['Key']))
                
                # S3 delete_objects has a limit of 1000 items
                if len(delete_us['Objects']) >= 1000:
                    client.delete_objects(Bucket=bucket, Delete=delete_us)
                    delete_us = dict(Objects=[])
                    
        # Delete remaining
        if len(delete_us['Objects']):
            client.delete_objects(Bucket=bucket, Delete=delete_us)
            
        return True
    except client.exceptions.NoSuchBucket:
        logger.error(f"Bucket {bucket} does not exist.")
        return False
    except Exception as e:
        logger.error(f"Failed to delete S3 folder {prefix}: {e}")
        return False
