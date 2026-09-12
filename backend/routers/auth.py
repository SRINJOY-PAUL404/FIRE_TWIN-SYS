from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import models, schemas, auth
from database import get_db
from rate_limiter import login_limiter

router = APIRouter(prefix="/auth", tags=["auth"])

def _build_admin_response(user: models.User) -> schemas.AdminResponse:
    return schemas.AdminResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=getattr(user, "status", "active") or "active",
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(
    request: Request,
    response: Response,
    signup_data: schemas.SignupRequest,
    db: Session = Depends(get_db)
):
    email = signup_data.email.strip().lower()
    name = signup_data.name.strip()
    password = signup_data.password

    if not email or not password or not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name, email, and password are required"
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    # Allowed self-service roles: technician, admin (Safety Officer), viewer
    allowed_roles = ["technician", "admin", "viewer"]
    role = signup_data.role if signup_data.role in allowed_roles else "technician"

    hashed_pw = auth.get_password_hash(password)
    new_user = models.User(
        email=email,
        full_name=name,
        role=role,
        status="active",
        hashed_password=hashed_pw,
        is_active=True,
        created_at=datetime.utcnow(),
        last_login_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = auth.create_access_token(
        data={"sub": new_user.email, "id": new_user.id, "role": new_user.role, "name": new_user.name}
    )
    refresh_token = auth.create_refresh_token(
        data={"sub": new_user.email, "id": new_user.id}
    )

    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        httponly=True,
        max_age=auth.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        samesite="lax",
        secure=auth.COOKIE_SECURE,
        path="/"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _build_admin_response(new_user)
    }

@router.post("/login", response_model=schemas.Token)
def login(
    request: Request,
    response: Response,
    login_data: Optional[schemas.LoginRequest] = None,
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Extract email and password from JSON or form-data
    email = None
    password = None

    if login_data and login_data.email and login_data.password:
        email = login_data.email.strip().lower()
        password = login_data.password
    elif form_data and form_data.username and form_data.password:
        email = form_data.username.strip().lower()
        password = form_data.password
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )

    # 1. Rate limiting check (5 failed attempts per 15 min per IP/email)
    login_limiter.check_rate_limit(client_ip, email)

    # 2. Query user from database
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user or not auth.verify_password(password, user.hashed_password):
        login_limiter.record_failure(client_ip, email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Check if user is active / not disabled
    if getattr(user, "status", "active") == "disabled" or not getattr(user, "is_active", True):
        login_limiter.record_failure(client_ip, email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact system administrator."
        )

    # Reset rate limiting failure counter upon successful login
    login_limiter.record_success(client_ip, email)

    # 4. Update last login timestamp
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # 5. Generate short-lived Access Token & long-lived Refresh Token
    access_token = auth.create_access_token(
        data={"sub": user.email, "id": user.id, "role": user.role, "name": user.name}
    )
    refresh_token = auth.create_refresh_token(
        data={"sub": user.email, "id": user.id}
    )

    # 6. Set Refresh Token in httpOnly secure cookie
    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        httponly=True,
        max_age=auth.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        samesite="lax",
        secure=auth.COOKIE_SECURE,
        path="/"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _build_admin_response(user)
    }

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(
    request: Request,
    response: Response,
    body: Optional[dict] = Body(default=None),
    db: Session = Depends(get_db)
):
    # Extract refresh token from cookie or request body
    cookie_token = request.cookies.get("refreshToken") or request.cookies.get("refresh_token")
    req_token = body.get("refresh_token") if body else None
    token = cookie_token or req_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing from request cookie or body",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = auth.decode_refresh_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with refresh token no longer exists",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if getattr(user, "status", "active") == "disabled" or not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Generate new Access Token
    new_access_token = auth.create_access_token(
        data={"sub": user.email, "id": user.id, "role": user.role, "name": user.name}
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "user": _build_admin_response(user)
    }

@router.post("/logout")
def logout(response: Response):
    # Clear refresh token cookie
    response.delete_cookie(key="refreshToken", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=schemas.AdminResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return _build_admin_response(current_user)
