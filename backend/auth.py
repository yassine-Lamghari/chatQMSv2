"""
JWT authentication helpers.
Generates/validates access tokens so the frontend no longer relies
on unsigned localStorage objects.
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

# ── Sécurité #1 : forcer une vraie clé secrète ──────────────────────────────
_raw_secret = os.getenv("JWT_SECRET_KEY", "")
if not _raw_secret or _raw_secret == "change-me-generate-a-long-random-secret-key-here":
    import logging as _logging
    _logging.getLogger(__name__).warning(
        "JWT_SECRET_KEY not set or using default value! "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(64))\""
    )
    # En dev on tolère, mais on génère une clé aléatoire par session
    _raw_secret = secrets.token_hex(64)

SECRET_KEY = _raw_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 hours


def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
