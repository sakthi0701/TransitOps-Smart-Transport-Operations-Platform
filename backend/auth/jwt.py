"""
JWT creation, verification, and password hashing utilities.
SECRET_KEY should be overridden via environment variable in production.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
import bcrypt as _bcrypt

# ── Configuration ──────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("SECRET_KEY", "transitops-super-secret-key-change-before-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8h


# ── Password helpers ───────────────────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Returns True if the plain password matches the stored bcrypt hash."""
    return _bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    """Returns bcrypt hash of the supplied plain-text password."""
    salt = _bcrypt.gensalt()
    return _bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


# ── Token helpers ──────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT.
    `data` dict should contain: {"sub": str(user_id), "email": email, "role": role}
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT.
    Returns the payload dict on success, None if invalid or expired.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
