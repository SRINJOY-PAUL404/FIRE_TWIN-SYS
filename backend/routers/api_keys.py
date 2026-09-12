from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import secrets
import hashlib
import models, schemas
from auth import get_admin_user, get_current_user
from database import get_db

router = APIRouter(prefix="/api-keys", tags=["api_keys"], dependencies=[Depends(get_current_user)])

def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

@router.get("/", response_model=List[schemas.ApiKey])
def read_api_keys(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ApiKey).offset(skip).limit(limit).all()

@router.post("/", response_model=schemas.ApiKeyResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(api_key: schemas.ApiKeyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    raw_key = f"fk_live_{secrets.token_hex(16)}"
    masked_key = f"fk_live_••••{raw_key[-4:]}"
    hashed_key = hash_api_key(raw_key)
    
    db_api_key = models.ApiKey(
        name=api_key.name,
        masked_key=masked_key,
        hashed_key=hashed_key,
        is_active=True
    )
    db.add(db_api_key)
    db.commit()
    db.refresh(db_api_key)
    
    response = schemas.ApiKeyResponse.model_validate(db_api_key)
    response.full_key = raw_key
    return response

@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key(api_key_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    db_api_key = db.query(models.ApiKey).filter(models.ApiKey.id == api_key_id).first()
    if not db_api_key:
        raise HTTPException(status_code=404, detail="API Key not found")
    
    db_api_key.is_active = False
    db.commit()
    return None
