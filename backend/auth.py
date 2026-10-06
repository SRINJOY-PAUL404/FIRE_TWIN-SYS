import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "firetwin_super_jwt_secret_key_2026_prod"))
REFRESH_SECRET = os.getenv("REFRESH_SECRET", "firetwin_super_refresh_jwt_secret_key_2026_prod")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    if isinstance(plain_password, str):
        plain_password_bytes = plain_password.encode("utf-8")
    else:
        plain_password_bytes = plain_password
    if isinstance(hashed_password, str):
        hashed_password_bytes = hashed_password.encode("utf-8")
    else:
        hashed_password_bytes = hashed_password
    try:
        return bcrypt.checkpw(plain_password_bytes[:72], hashed_password_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    if isinstance(password, str):
        password_bytes = password.encode("utf-8")
    else:
        password_bytes = password
    # Minimum 10 salt rounds (using 12 rounds for strong security)
    return bcrypt.hashpw(password_bytes[:72], bcrypt.gensalt(12)).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, REFRESH_SECRET, algorithm=ALGORITHM)

def decode_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, REFRESH_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type for refresh",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"}
        )

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    # Auth disabled — return the first super_admin user from DB
    user = db.query(models.User).filter(models.User.role.in_(["super_admin", "CMD_ADMIN"])).first()
    if not user:
        user = db.query(models.User).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No users found in the database. Please run the seed script.",
        )
    return user

def get_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role not in ["super_admin", "admin", "CMD_ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required")
    return current_user

def get_super_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role not in ["super_admin", "CMD_ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super administrator permissions required")
    return current_user
