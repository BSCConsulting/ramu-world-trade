"""Configuration loader for World of Trade.
Loads environment variables from .env using pure Python standard library.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def load_env(env_path: Path = None):
    """Load key-value pairs from .env into os.environ."""
    if env_path is None:
        env_path = BASE_DIR / ".env"
    
    if not env_path.exists():
        return
    
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("\"'")
            if key not in os.environ:
                os.environ[key] = val

# Initialize on import
load_env()

DATA_GOV_IN_API_KEY = os.getenv("DATA_GOV_IN_API_KEY", "")
DATA_GOV_IN_BASE_URL = os.getenv("DATA_GOV_IN_BASE_URL", "https://api.data.gov.in/resource")
IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
CACHE_DB_PATH = Path("/tmp/trade_cache.db") if IS_VERCEL else BASE_DIR / "trade_cache.db"
DATA_DIR = BASE_DIR / "data"
try:
    DATA_DIR.mkdir(exist_ok=True)
except Exception:
    pass

