"""
Chiffrement des clés API stockées en base (amélioration #4).
Utilise Fernet (AES-128-CBC + HMAC-SHA256) via la lib cryptography.
Si la clé de chiffrement n'est pas configurée, les valeurs sont stockées
en clair (comportement legacy, avec un avertissement).
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

_FERNET = None
_ENCRYPTION_AVAILABLE = False

try:
    from cryptography.fernet import Fernet, InvalidToken

    _key_b = os.getenv("API_KEY_ENCRYPTION_KEY", "")
    if _key_b and len(_key_b) >= 32:
        try:
            _FERNET = Fernet(_key_b.encode() if isinstance(_key_b, str) else _key_b)
            _ENCRYPTION_AVAILABLE = True
        except Exception as e:
            logger.warning("API_KEY_ENCRYPTION_KEY invalide (%s). Stockage en clair.", e)
    else:
        logger.warning(
            "API_KEY_ENCRYPTION_KEY non configurée. Les clés API seront stockées en clair. "
            "Générez une clé avec: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
except ImportError:
    logger.warning("cryptography non installé. Stockage des clés API en clair.")


def encrypt_api_key(plain: str | None) -> str | None:
    """Chiffre une clé API avant persistence. Retourne None si plain est vide."""
    if not plain or not plain.strip():
        return None
    if _ENCRYPTION_AVAILABLE and _FERNET:
        try:
            return _FERNET.encrypt(plain.encode()).decode()
        except Exception as e:
            logger.warning("Échec du chiffrement: %s", e)
    return plain  # fallback clair


def decrypt_api_key(stored: str | None) -> str | None:
    """Déchiffre une clé API depuis la base. Gère les valeurs legacy en clair."""
    if not stored or not stored.strip():
        return None
    if _ENCRYPTION_AVAILABLE and _FERNET:
        try:
            from cryptography.fernet import InvalidToken
            return _FERNET.decrypt(stored.encode()).decode()
        except Exception:
            # Valeur legacy en clair — retourner telle quelle
            return stored
    return stored
