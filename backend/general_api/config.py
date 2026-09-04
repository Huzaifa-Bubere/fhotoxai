import os
from dotenv import load_dotenv

load_dotenv()

# API Configuration
API_TITLE = "Event Management Company API"
API_VERSION = "1.0.0"

# Database Configuration (PostgreSQL)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "digitalnexusai_emc_db")

# SMTP / Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "mail.digitalnexusai.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "admissions@digitalnexusai.com")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "Nanite12#")

# Frontend URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://events.digitalnexusai.com")

# Clustering Thresholds
CLUSTERING_THRESHOLD = 0.68
MERGE_THRESHOLD = 0.72

# Embedding Dimension (must match face model output)
EMBEDDING_DIM = 512

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERAL_API_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
BANNERS_DIR = os.path.join(GENERAL_API_DIR, "banners")

# Ensure directories exist
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(BANNERS_DIR, exist_ok=True)