"""Local SQLite cache manager for trade queries.
Stores raw API responses and processed datasets to minimize network traffic
and stay well under daily free-tier rate limits.
"""
import sqlite3
import json
import time
from typing import Optional, Any
from config import CACHE_DB_PATH

def init_db():
    """Initialize the cache database schema."""
    try:
        with sqlite3.connect(CACHE_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_cache (
                    cache_key TEXT PRIMARY KEY,
                    endpoint TEXT,
                    response_json TEXT,
                    record_count INTEGER,
                    created_at REAL,
                    expires_at REAL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS query_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_text TEXT,
                    primary_source TEXT,
                    reconciled_status TEXT,
                    timestamp REAL
                )
            """)
            conn.commit()
    except Exception:
        pass

def get_cached_response(cache_key: str) -> Optional[dict]:
    """Retrieve cached JSON response if valid and not expired."""
    try:
        init_db()
        now = time.time()
        with sqlite3.connect(CACHE_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT response_json FROM api_cache WHERE cache_key = ? AND expires_at > ?",
                (cache_key, now)
            )
            row = cursor.fetchone()
            if row:
                try:
                    return json.loads(row[0])
                except Exception:
                    return None
    except Exception:
        pass
    return None

def set_cached_response(cache_key: str, endpoint: str, data: Any, ttl_seconds: int = 86400):
    """Store response in cache with time-to-live (default 24 hours)."""
    try:
        init_db()
        now = time.time()
        expires_at = now + ttl_seconds
        data_str = json.dumps(data)
        record_count = len(data) if isinstance(data, list) else 1
        with sqlite3.connect(CACHE_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO api_cache (cache_key, endpoint, response_json, record_count, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (cache_key, endpoint, data_str, record_count, now, expires_at))
            conn.commit()
    except Exception:
        pass

def log_query(query_text: str, primary_source: str, reconciled_status: str):
    """Log user query in local history for audit trail."""
    try:
        init_db()
        with sqlite3.connect(CACHE_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO query_history (query_text, primary_source, reconciled_status, timestamp)
                VALUES (?, ?, ?, ?)
            """, (query_text, primary_source, reconciled_status, time.time()))
            conn.commit()
    except Exception:
        pass

