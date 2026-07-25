from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
from typing import Annotated, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings
from app.db import fetch_one

bearer = HTTPBearer(auto_error=False)
PBKDF2_ITERATIONS = 390_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        PBKDF2_ITERATIONS,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(user: dict) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user["user_id"]),
        "email": user["email"],
        "role": user["role_name"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)],
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    try:
        payload = jwt.decode(
            credentials.credentials,
            get_settings().secret_key,
            algorithms=["HS256"],
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = fetch_one(
        """
        SELECT u.user_id, u.full_name, u.email, u.is_active, r.role_name, r.permission_level
        FROM app_user u
        JOIN role r ON r.role_id = u.role_id
        WHERE u.user_id = %s
        """,
        (int(payload["sub"]),),
    )
    if not user or not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")
    return user


def require_permission(min_permission_level: int):
    def dependency(user: Annotated[dict, Depends(get_current_user)]) -> dict:
        if user["permission_level"] < min_permission_level:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency


def ensure_offering_access(user: dict, offering_id: int, min_permission_level: int = 10) -> dict:
    if user["permission_level"] < min_permission_level:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
    if user["role_name"] == "management":
        return user

    if user["role_name"] == "coordinator":
        access = fetch_one(
            "SELECT 1 FROM unit_offering WHERE offering_id = %s AND coordinator_id = %s",
            (offering_id, user["user_id"]),
        )
    elif user["role_name"] == "lecturer":
        access = fetch_one(
            "SELECT 1 FROM offering_lecturer WHERE offering_id = %s AND lecturer_id = %s",
            (offering_id, user["user_id"]),
        )
    else:
        access = None

    if not access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this offering")
    return user


def require_offering_access(min_permission_level: int = 10):
    def dependency(
        user: Annotated[dict, Depends(get_current_user)],
        offering_id: int = 1,
    ) -> dict:
        return ensure_offering_access(user, offering_id, min_permission_level)

    return dependency
