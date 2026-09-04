"""
Database connection and utilities for Photo Clustering API
Connects to PostgreSQL database with pgvector support
"""

import os
import numpy as np
import psycopg2
import psycopg2.pool
import psycopg2.extras
from typing import Optional, List, Dict, Any
import logging

from ai_api.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': DB_HOST,
    'port': DB_PORT,
    'user': DB_USER,
    'password': DB_PASSWORD,
    'dbname': DB_NAME,
}

# -------------------------------------------------------------------
# pgvector adapter: transparently convert between numpy arrays and
# PostgreSQL vector columns.
# -------------------------------------------------------------------
try:
    from pgvector.psycopg2 import register_vector as _register_vector
    _PGVECTOR_AVAILABLE = True
except ImportError:
    _register_vector = None
    _PGVECTOR_AVAILABLE = False
    logger.warning("pgvector Python package not installed. Vector operations will be unavailable. Install with: pip install pgvector")


QueryParams = Optional[tuple[Any, ...]]


def _adapt_numpy(arr):
    """Convert numpy array to a string PostgreSQL can understand as a vector literal."""
    if isinstance(arr, np.ndarray):
        return psycopg2.extensions.AsIs("'[" + ",".join(str(float(x)) for x in arr.flatten()) + "]'::vector")
    return arr


# Register the numpy adapter globally so that execute_* helpers
# transparently send numpy arrays as vector literals.
psycopg2.extensions.register_adapter(np.ndarray, _adapt_numpy)

# Create connection pool with retry logic (for Docker startup)
import time

connection_pool = None
_MAX_RETRIES = 10
_RETRY_DELAY = 2  # seconds

for _attempt in range(1, _MAX_RETRIES + 1):
    try:
        connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=32,
            **DB_CONFIG
        )
        logger.info(f"PostgreSQL connection pool created for {DB_CONFIG['dbname']}")
        break
    except psycopg2.Error as err:
        if _attempt < _MAX_RETRIES:
            logger.warning(f"DB connection attempt {_attempt}/{_MAX_RETRIES} failed: {err}. Retrying in {_RETRY_DELAY}s...")
            time.sleep(_RETRY_DELAY)
        else:
            logger.error(f"Failed to create connection pool after {_MAX_RETRIES} attempts: {err}")
            connection_pool = None


def get_connection():
    """Get a connection from the pool"""
    if connection_pool:
        try:
            conn = connection_pool.getconn()
            conn.autocommit = True
            return conn
        except psycopg2.Error as err:
            logger.error(f"Error getting connection: {err}")
            raise
    else:
        raise Exception("Database connection pool not initialized")


def _return_connection(conn: Any) -> None:
    """Return a connection to the pool"""
    if connection_pool and conn:
        try:
            connection_pool.putconn(conn)
        except Exception:
            pass


def test_connection() -> bool:
    """Test database connection"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
    finally:
        _return_connection(conn)


def _register_pgvector(conn: Any) -> None:
    """Register pgvector type on a connection if available."""
    if _PGVECTOR_AVAILABLE and _register_vector is not None:
        try:
            _register_vector(conn)
        except Exception:
            pass  # extension may not be installed in this DB yet


def execute_query(query: str, params: QueryParams = None) -> List[Dict[str, Any]]:
    """
    Execute a SELECT query and return results as list of dictionaries
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        _register_pgvector(conn)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(query, params or ())
        results = [dict(row) for row in cursor.fetchall()]
        return results
    except psycopg2.Error as err:
        logger.error(f"Query execution error: {err}")
        raise
    finally:
        if cursor:
            cursor.close()
        _return_connection(conn)


def execute_insert(query: str, params: QueryParams = None) -> int:
    """
    Execute an INSERT query and return the last inserted ID.
    The query MUST include 'RETURNING id' at the end.
    If RETURNING is missing, it is appended automatically.
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        _register_pgvector(conn)
        # Auto-append RETURNING id if not present
        q = query.rstrip().rstrip(';')
        if 'returning' not in q.lower():
            q += ' RETURNING id'
        cursor = conn.cursor()
        cursor.execute(q, params or ())
        row = cursor.fetchone()
        if row is None or row[0] is None:
            raise RuntimeError("Insert query did not return an id")
        last_id = int(row[0])
        conn.commit()
        return last_id
    except psycopg2.Error as err:
        logger.error(f"Insert execution error: {err}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        _return_connection(conn)


def execute_update(query: str, params: QueryParams = None) -> int:
    """
    Execute an UPDATE/DELETE query and return affected rows
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        _register_pgvector(conn)
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        affected = cursor.rowcount
        conn.commit()
        return affected
    except psycopg2.Error as err:
        logger.error(f"Update execution error: {err}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        _return_connection(conn)


def execute_many(query: str, params_list: List[tuple[Any, ...]]) -> int:
    """
    Execute a query multiple times with different parameters (bulk insert).
    Uses psycopg2.extras.execute_batch for efficiency.
    """
    conn = None
    cursor = None
    try:
        conn = get_connection()
        _register_pgvector(conn)
        cursor = conn.cursor()
        psycopg2.extras.execute_batch(cursor, query, params_list)
        affected = cursor.rowcount
        conn.commit()
        return affected
    except psycopg2.Error as err:
        logger.error(f"Bulk execution error: {err}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        _return_connection(conn)


class DatabaseTransaction:
    """Context manager for database transactions"""

    def __init__(self):
        self.conn: Any = None
        self.cursor: Any = None

    def __enter__(self):
        self.conn = get_connection()
        self.conn.autocommit = False
        _register_pgvector(self.conn)
        self.cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return self.cursor

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn is None:
            return False

        if exc_type is not None:
            self.conn.rollback()
            logger.error(f"Transaction rolled back due to error: {exc_val}")
        else:
            self.conn.commit()

        if self.cursor:
            self.cursor.close()
        _return_connection(self.conn)

        return False  # Don't suppress exceptions


def execute_query_safely(query: str, params: QueryParams = None) -> Optional[List[Dict[str, Any]]]:
    """Execute query with internal error handling"""
    try:
        return execute_query(query, params)
    except Exception as e:
        logger.error(f"Safe query execution error: {e}")
        return None


def execute_update_safely(query: str, params: QueryParams = None) -> int:
    """Execute update with internal error handling"""
    try:
        return execute_update(query, params)
    except Exception as e:
        logger.error(f"Safe update execution error: {e}")
        return 0


# Test connection on module load
if connection_pool:
    test_connection()
