import hashlib
import logging
import os
import re
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, Optional, Set

import bcrypt
from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

from general_api.database import execute_insert, execute_query, execute_update, execute_update_safely

logger = logging.getLogger("auth_utils")

SESSION_COOKIE_NAME = "session_id"
SESSION_HEADER_NAME = "x-session-id"
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "7"))
ROLE_PRIORITY = {
    "admin": 1,
    "organizer": 2,
    "photographer": 3,
    "attendee": 4,
}
ROLE_DESCRIPTIONS = {
    "admin": "System Administrator",
    "organizer": "Event Organizer",
    "photographer": "Event Photographer",
    "attendee": "Event Attendee",
}
ALLOWED_ROLES = set(ROLE_PRIORITY.keys())


def normalize_role(role: str) -> str:
    return (role or "").strip().lower()


def is_valid_role(role: str) -> bool:
    return normalize_role(role) in ALLOWED_ROLES


def is_bcrypt_hash(password_hash: Optional[str]) -> bool:
    if not password_hash:
        return False
    return password_hash.startswith(("$2a$", "$2b$", "$2y$"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False

    if is_bcrypt_hash(password_hash):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except ValueError:
            return False

    # Temporary compatibility path for older SHA-256 records.
    return hashlib.sha256(password.encode("utf-8")).hexdigest() == password_hash


def build_username(email: str, role: str) -> str:
    local_part = email.split("@", 1)[0].lower()
    slug = re.sub(r"[^a-z0-9]+", "_", local_part).strip("_") or "user"
    suffix = secrets.token_hex(3)
    return f"{slug}_{role}_{suffix}"


def sanitize_user(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "username": row.get("username"),
        "email": row.get("email"),
        "full_name": row.get("full_name"),
        "organization": row.get("organization"),
        "role": row.get("role") or "organizer",
        "is_active": row.get("is_active", True),
    }


def _role_subquery() -> str:
    return """
        COALESCE(
            (
                SELECT r.name
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = u.id
                ORDER BY CASE r.name
                    WHEN 'admin' THEN 1
                    WHEN 'organizer' THEN 2
                    WHEN 'photographer' THEN 3
                    WHEN 'attendee' THEN 4
                    ELSE 99
                END
                LIMIT 1
            ),
            'organizer'
        )
    """


def get_user_by_identity(identity: str) -> Optional[Dict[str, Any]]:
    rows = execute_query(
        f"""
        SELECT
            u.id,
            u.username,
            u.email,
            u.password_hash,
            u.full_name,
            u.organization,
            u.is_active,
            {_role_subquery()} AS role
        FROM users u
        WHERE LOWER(u.email) = LOWER(%s) OR LOWER(u.username) = LOWER(%s)
        LIMIT 1
        """,
        (identity, identity),
    )
    return rows[0] if rows else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    rows = execute_query(
        f"""
        SELECT
            u.id,
            u.username,
            u.email,
            u.full_name,
            u.organization,
            u.is_active,
            {_role_subquery()} AS role
        FROM users u
        WHERE u.id = %s
        LIMIT 1
        """,
        (user_id,),
    )
    return rows[0] if rows else None


def get_attendee_user_id_by_email(email: str) -> Optional[int]:
    rows = execute_query(
        """
        SELECT u.id
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE LOWER(u.email) = LOWER(%s) AND r.name = 'attendee'
        LIMIT 1
        """,
        (email,),
    )
    return rows[0]["id"] if rows else None


def user_has_any_role(user_id: int, roles: Iterable[str]) -> bool:
    normalized_roles = [normalize_role(role) for role in roles if normalize_role(role)]
    if not normalized_roles:
        return True

    placeholders = ", ".join(["%s"] * len(normalized_roles))
    rows = execute_query(
        f"""
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s
          AND LOWER(r.name) IN ({placeholders})
        LIMIT 1
        """,
        (user_id, *normalized_roles),
    )
    return bool(rows)


def link_attendees_to_user(user_id: int, email: str) -> int:
    return execute_update(
        """
        UPDATE attendees
        SET user_id = %s
        WHERE user_id IS NULL
          AND email IS NOT NULL
          AND LOWER(email) = LOWER(%s)
        """,
        (user_id, email),
    )


def create_user_session(
    user_id: int,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> str:
    session_id = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    expires_at = now + timedelta(days=SESSION_TTL_DAYS)
    execute_insert(
        """
        INSERT INTO user_sessions (user_id, session_id, user_agent, ip_address, created_at, last_seen_at, expires_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (user_id, session_id, user_agent, ip_address, now, now, expires_at),
    )
    return session_id


def delete_user_session(session_id: str) -> int:
    return execute_update("DELETE FROM user_sessions WHERE session_id = %s", (session_id,))


def clear_expired_sessions() -> int:
    return execute_update_safely("DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP")


def get_request_ip(request: Request) -> Optional[str]:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def get_session_id_from_request(request: Request) -> Optional[str]:
    header_value = request.headers.get(SESSION_HEADER_NAME)
    if header_value:
        return header_value.strip()

    cookie_value = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie_value:
        return cookie_value.strip()

    return None


def get_session_user(session_id: str) -> Optional[Dict[str, Any]]:
    rows = execute_query(
        f"""
        SELECT
            s.user_id,
            s.session_id,
            s.expires_at,
            u.id,
            u.username,
            u.email,
            u.full_name,
            u.organization,
            u.is_active,
            {_role_subquery()} AS role
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.session_id = %s
        LIMIT 1
        """,
        (session_id,),
    )
    if not rows:
        return None

    session_user = rows[0]
    expires_at = session_user.get("expires_at")
    if expires_at and expires_at < datetime.utcnow():
        delete_user_session(session_id)
        return None

    if not session_user.get("is_active", True):
        return None

    execute_update_safely(
        "UPDATE user_sessions SET last_seen_at = %s WHERE session_id = %s",
        (datetime.utcnow(), session_id),
    )
    return sanitize_user(session_user)


def set_session_cookie(response, session_id: str) -> None:
    secure_default = os.getenv("SESSION_COOKIE_SECURE", "false").strip().lower() in {"1", "true", "yes"}
    max_age = SESSION_TTL_DAYS * 24 * 60 * 60
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=secure_default,
        samesite="lax",
        max_age=max_age,
        expires=max_age,
        path="/",
    )


def clear_session_cookie(response) -> None:
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")


def get_authenticated_user(request: Request) -> Dict[str, Any]:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return user


def require_roles(*allowed_roles: str):
    normalized_roles = {normalize_role(role) for role in allowed_roles if normalize_role(role)}

    def dependency(request: Request) -> Dict[str, Any]:
        user = get_authenticated_user(request)
        user_role = normalize_role(user.get("role"))

        if user_role == "admin":
            return user

        if normalized_roles and user_role not in normalized_roles:
            if not user_has_any_role(user["id"], normalized_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied for role '{user_role}'.",
                )
        return user

    return dependency


def assert_same_user_or_admin(current_user: Dict[str, Any], target_user_id: int) -> None:
    if normalize_role(current_user.get("role")) == "admin":
        return

    if int(current_user["id"]) != int(target_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own dashboard data.",
        )


def assert_event_access(current_user: Dict[str, Any], event_id: int, allowed_roles: Iterable[str]) -> None:
    user_role = normalize_role(current_user.get("role"))
    normalized_roles: Set[str] = {normalize_role(role) for role in allowed_roles}

    if user_role == "admin":
        return

    if user_role not in normalized_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this event.",
        )

    if user_role == "organizer":
        rows = execute_query(
            """
            SELECT 1
            FROM user_events
            WHERE user_id = %s AND event_id = %s AND role = 'organizer'
            UNION
            SELECT 1
            FROM events
            WHERE id = %s AND created_by = %s
            LIMIT 1
            """,
            (current_user["id"], event_id, event_id, current_user["id"]),
        )
        if rows:
            return

    if user_role == "photographer":
        rows = execute_query(
            """
            SELECT 1
            FROM user_events
            WHERE user_id = %s AND event_id = %s AND role = 'photographer'
            UNION
            SELECT 1
            FROM event_photographers
            WHERE photographer_id = %s AND event_id = %s
            LIMIT 1
            """,
            (current_user["id"], event_id, current_user["id"], event_id),
        )
        if rows:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this event.",
    )


def assert_attendee_access(
    current_user: Dict[str, Any],
    attendee_id: int,
    event_id: Optional[int] = None,
) -> Dict[str, Any]:
    user_role = normalize_role(current_user.get("role"))
    is_admin = user_role == "admin"
    is_attendee = user_role == "attendee" or user_has_any_role(current_user["id"], ["attendee"])

    if is_admin:
        rows = execute_query(
            """
            SELECT id, event_id, email, user_id
            FROM attendees
            WHERE id = %s AND (%s IS NULL OR event_id = %s)
            LIMIT 1
            """,
            (attendee_id, event_id, event_id),
        )
    else:
        if not is_attendee:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only attendees can access attendee-only resources.",
            )

        rows = execute_query(
            """
            SELECT a.id, a.event_id, a.email, a.user_id
            FROM attendees a
            JOIN users u ON u.id = %s
            WHERE a.id = %s
              AND (%s IS NULL OR a.event_id = %s)
              AND (
                  a.user_id = u.id
                  OR (
                      a.user_id IS NULL
                      AND a.email IS NOT NULL
                      AND LOWER(a.email) = LOWER(u.email)
                  )
              )
            LIMIT 1
            """,
            (current_user["id"], attendee_id, event_id, event_id),
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this attendee profile.",
        )

    return rows[0]


def ensure_auth_schema() -> None:
    statements = [
        """
        INSERT INTO roles (name, description)
        VALUES ('attendee', 'Event Attendee')
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
        """,
        """
        CREATE TABLE IF NOT EXISTS user_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_id VARCHAR(255) UNIQUE NOT NULL,
            user_agent TEXT,
            ip_address VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)",
        """
        ALTER TABLE attendees
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
        """,
        "CREATE INDEX IF NOT EXISTS idx_attendees_user_id ON attendees(user_id)",
        """
        UPDATE attendees AS a
        SET user_id = u.id
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'attendee'
          AND a.user_id IS NULL
          AND a.email IS NOT NULL
          AND LOWER(a.email) = LOWER(u.email)
        """,
    ]

    for statement in statements:
        execute_update_safely(statement)

    clear_expired_sessions()


class SessionAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.user = None
        request.state.session_id = None

        session_id = get_session_id_from_request(request)
        if session_id:
            try:
                user = get_session_user(session_id)
                if user:
                    request.state.user = user
                    request.state.session_id = session_id
            except Exception as exc:
                logger.warning("Session lookup failed: %s", exc)

        response = await call_next(request)
        return response
