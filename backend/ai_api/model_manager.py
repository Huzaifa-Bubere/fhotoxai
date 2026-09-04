
import os
import logging
import requests
import torch
from pathlib import Path
import sys
import time
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("model_manager")

# Base directory - one level up from this file
# Since this moved to ai_api, models should probably still be in backend/models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Create models directory if it doesn't exist
os.makedirs(MODELS_DIR, exist_ok=True)

# Model URLs - using torch hub/huggingface models
MODEL_URLS = {
    "mtcnn": "https://github.com/timesler/facenet-pytorch/releases/download/v2.2.9/mtcnn.pt",
    "inception_resnet": "https://github.com/timesler/facenet-pytorch/releases/download/v2.2.9/20180402-114759-vggface2.pt"
}

def check_model_exists(model_name):
    """
    Check if a model file exists in the models directory
    
    Args:
        model_name: Name of the model (mtcnn, inception_resnet)
        
    Returns:
        bool: True if model file exists, False otherwise
    """
    if model_name == "mtcnn":
        return os.path.exists(os.path.join(MODELS_DIR, "mtcnn_model.pt"))
    elif model_name == "inception_resnet":
        return os.path.exists(os.path.join(MODELS_DIR, "resnet_model.pt"))
    else:
        return False

def download_model(model_name):
    """
    Download a model file from the specified URL
    
    Args:
        model_name: Name of the model to download (mtcnn, inception_resnet)
        
    Returns:
        bool: True if download successful, False otherwise
    """
    if model_name not in MODEL_URLS:
        logger.error(f"Unknown model name: {model_name}")
        return False
    
    url = MODEL_URLS[model_name]
    output_file = os.path.join(MODELS_DIR, f"{model_name}_model.pt")
    
    if model_name == "inception_resnet":
        output_file = os.path.join(MODELS_DIR, "resnet_model.pt")
    
    try:
        logger.info(f"Downloading {model_name} model from {url}")
        
        # Create a streaming request to show progress
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Get file size for progress bar
        file_size = int(response.headers.get('content-length', 0))
        block_size = 8192  # 8KB blocks
        progress_bar = tqdm(
            total=file_size, 
            unit='B', 
            unit_scale=True,
            desc=f"Downloading {model_name}"
        )
        
        # Download file with progress reporting
        with open(output_file, 'wb') as f:
            for data in response.iter_content(block_size):
                progress_bar.update(len(data))
                f.write(data)
        
        progress_bar.close()
        
        if file_size != 0 and progress_bar.n != file_size:
            logger.warning("Downloaded file size doesn't match expected size!")
        
        logger.info(f"Downloaded {model_name} model successfully to {output_file}")
        return True
        
    except Exception as e:
        logger.error(f"Error downloading {model_name} model: {e}")
        # Clean up partial download
        if os.path.exists(output_file):
            try:
                os.remove(output_file)
            except:
                pass
        return False

def ensure_models_available(required_models=None):
    """
    Ensure that all required models are available.
    
    Checks if model files exist locally and downloads them if missing.
    Falls back to letting facenet-pytorch handle downloads for models
    that cannot be downloaded from the configured URLs.
    
    Args:
        required_models: List of required models (if None, checks all models)
        
    Returns:
        bool: True if all required models are available or can be obtained
    """
    if required_models is None:
        required_models = list(MODEL_URLS.keys())
    
    all_available = True
    missing_models = []
    
    for model_name in required_models:
        if check_model_exists(model_name):
            logger.info(f"Model '{model_name}' is available locally.")
        else:
            missing_models.append(model_name)
            logger.warning(f"Model '{model_name}' is missing locally.")
    
    if not missing_models:
        logger.info("All required models are available.")
        return True
    
    # Attempt to download missing models
    for model_name in missing_models:
        logger.info(f"Attempting to download missing model: {model_name}")
        success = download_model(model_name)
        if not success:
            logger.warning(
                f"Could not download '{model_name}' from configured URL. "
                f"facenet-pytorch will attempt automatic download on first use."
            )
            # Not a hard failure — facenet-pytorch can still auto-download
        else:
            logger.info(f"Successfully downloaded model: {model_name}")
    
    return True  # facenet-pytorch can auto-download as fallback

def load_model_with_retry(loader_func, max_retries=3, retry_delay=2):
    """
    Load a model with retry logic
    
    Args:
        loader_func: Function that loads the model
        max_retries: Maximum number of retry attempts
        retry_delay: Delay between retries in seconds
        
    Returns:
        The loaded model, or None if loading fails
    """
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Loading model (attempt {attempt}/{max_retries})...")
            model = loader_func()
            logger.info("Model loaded successfully")
            return model
        except Exception as e:
            logger.warning(f"Model loading failed (attempt {attempt}/{max_retries}): {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
    
    logger.error(f"Model loading failed after {max_retries} attempts")
    return None

def get_device():
    """
    Get the best available device for running models
    
    Returns:
        torch.device: CUDA device if available, otherwise CPU
    """
    if torch.cuda.is_available():
        device = torch.device('cuda')
        logger.info(f"Using GPU: {torch.cuda.get_device_name(0)}")
    else:
        device = torch.device('cpu')
        logger.info("GPU not available, using CPU")
    
    return device

if __name__ == "__main__":
    # Run checks if script is executed directly
    print("\n--- Model Availability Check ---")
    
    # Check CUDA availability
    if torch.cuda.is_available():
        print(f"✅ GPU available: {torch.cuda.get_device_name(0)}")
    else:
        print("⚠️ GPU not available, using CPU")
    
    # Check if models exist
    all_available = True
    for model_name in MODEL_URLS.keys():
        if check_model_exists(model_name):
            print(f"✅ {model_name} model available")
        else:
            print(f"❌ {model_name} model missing")
            all_available = False
    
    # Offer to download missing models
    if not all_available:
        print("\nSome models are missing. Download them? (y/n)")
        choice = input().strip().lower()
        if choice == 'y':
            ensure_models_available()
        else:
            print("Skipping download")
    
    print("\nDone!")
