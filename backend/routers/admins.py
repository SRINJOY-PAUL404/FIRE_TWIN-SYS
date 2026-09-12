from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/admins", tags=["admins"], dependencies=[Depends(auth.get_super_admin)])

def _to_admin_response(user: models.User) -> schemas.AdminResponse:
    return schemas.AdminResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=getattr(user, "status", "active") or "active",
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )

@router.get("/", response_model=List[schemas.AdminResponse])
def list_admins(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_super_admin)
):
    users = db.query(models.User).order_by(models.User.id.asc()).all()
    return [_to_admin_response(u) for u in users]

@router.post("/", response_model=schemas.AdminResponse, status_code=status.HTTP_201_CREATED)
def create_admin(
    admin_in: schemas.AdminCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_super_admin)
):
    email = admin_in.email.strip().lower()
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An administrator or user with this email already exists."
        )

    role = admin_in.role if admin_in.role in ["super_admin", "admin"] else "admin"
    status_val = admin_in.status if admin_in.status in ["active", "disabled"] else "active"

    hashed_pw = auth.get_password_hash(admin_in.password)
    new_user = models.User(
        email=email,
        full_name=admin_in.name,
        role=role,
        status=status_val,
        hashed_password=hashed_pw,
        is_active=(status_val == "active"),
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return _to_admin_response(new_user)

@router.patch("/{admin_id}", response_model=schemas.AdminResponse)
def update_admin(
    admin_id: int,
    admin_update: schemas.AdminUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_super_admin)
):
    user = db.query(models.User).filter(models.User.id == admin_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")

    if admin_update.name is not None:
        user.full_name = admin_update.name
    if admin_update.email is not None:
        email = admin_update.email.strip().lower()
        if email != user.email:
            existing = db.query(models.User).filter(models.User.email == email).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already in use by another account")
            user.email = email
    if admin_update.role is not None:
        if admin_update.role in ["super_admin", "admin"]:
            # If demoting self, verify there's at least one other active super_admin
            if user.id == current_admin.id and admin_update.role != "super_admin":
                other_super = db.query(models.User).filter(
                    models.User.id != current_admin.id,
                    models.User.role.in_(["super_admin", "CMD_ADMIN"]),
                    models.User.is_active == True
                ).first()
                if not other_super:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot demote the sole super administrator account."
                    )
            user.role = admin_update.role
    if admin_update.status is not None:
        if admin_update.status in ["active", "disabled"]:
            if user.id == current_admin.id and admin_update.status == "disabled":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot disable your own active administrator account."
                )
            user.status = admin_update.status
            user.is_active = (admin_update.status == "active")
    if admin_update.password is not None and admin_update.password.strip():
        user.hashed_password = auth.get_password_hash(admin_update.password)

    db.commit()
    db.refresh(user)
    return _to_admin_response(user)

@router.delete("/{admin_id}")
def delete_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_super_admin)
):
    if admin_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account. Please have another super administrator perform this action."
        )

    user = db.query(models.User).filter(models.User.id == admin_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")

    db.delete(user)
    db.commit()
    return {"message": f"Admin user '{user.email}' removed successfully"}
