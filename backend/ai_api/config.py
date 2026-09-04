import os
from dotenv import load_dotenv

# Resolve paths relative to the backend root instead of the process cwd.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# ==========================================
# API CONFIGURATION
# ==========================================

API_TITLE = "Event Management Company API"
API_VERSION = "1.0.0"


# ==========================================
# DATABASE CONFIGURATION (PostgreSQL)
# ==========================================

# Use the host machine from Docker, but keep localhost for non-container runs.
DEFAULT_DB_HOST = "host.docker.internal" if os.path.exists("/.dockerenv") else "localhost"

DB_HOST = os.getenv("DB_HOST", DEFAULT_DB_HOST)
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "digitalnexusai_emc_db")


# ==========================================
# SMTP / EMAIL CONFIGURATION
# ==========================================

SMTP_SERVER = os.getenv("SMTP_SERVER", "mail.digitalnexusai.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

MAIL_USERNAME = os.getenv(
    "MAIL_USERNAME",
    "admissions@digitalnexusai.com"
)

MAIL_PASSWORD = os.getenv(
    "MAIL_PASSWORD",
    ""
)


# ==========================================
# FRONTEND URL
# ==========================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://events.digitalnexusai.com"
)


# ==========================================
# AWS SQS CONFIGURATION
# ==========================================

AWS_SQS_QUEUE_URL = os.getenv(
    "AWS_SQS_QUEUE_URL",
    "https://sqs.ap-south-1.amazonaws.com/104363824017/photo-clustering"
)


# ==========================================
# CLUSTERING PARAMETERS
# ==========================================

CLUSTERING_THRESHOLD = float(os.getenv("CLUSTERING_THRESHOLD", "0.50"))
MERGE_THRESHOLD = float(os.getenv("MERGE_THRESHOLD", "0.50"))
PRE_CLUSTERING_THRESHOLD = float(os.getenv("PRE_CLUSTERING_THRESHOLD", "0.90"))


# ==========================================
# EMBEDDING CONFIG
# ==========================================

EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "512"))


# ==========================================
# PATH CONFIGURATION
# ==========================================

UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
BANNERS_DIR = os.path.join(BASE_DIR, "banners")


# ==========================================
# ENSURE REQUIRED DIRECTORIES EXIST
# ==========================================

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(BANNERS_DIR, exist_ok=True)
