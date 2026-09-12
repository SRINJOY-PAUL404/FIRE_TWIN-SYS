from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random
from datetime import datetime
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(auth.get_current_user)])

@router.get("/predict/{extinguisher_id}")
def predict_maintenance(extinguisher_id: int, db: Session = Depends(get_db)):
    ext = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.id == extinguisher_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extinguisher not found")
        
    # Prototype logic: 
    # Remaining useful life based on expiry date
    days_to_expiry = (ext.expiry_date - datetime.utcnow()).days
    
    if days_to_expiry < 0:
        failure_prob = 0.99
        priority = "Critical"
    elif days_to_expiry < 30:
        failure_prob = 0.85
        priority = "High"
    elif ext.pressure < 60.0:
        failure_prob = 0.75
        priority = "High"
    elif ext.pressure < 90.0:
        failure_prob = 0.40
        priority = "Medium"
    else:
        failure_prob = round(random.uniform(0.01, 0.15), 2)
        priority = "Low"
        
    return {
        "extinguisher_id": extinguisher_id,
        "failure_probability": failure_prob,
        "maintenance_priority": priority,
        "remaining_useful_life_days": days_to_expiry,
        "confidence_score": round(random.uniform(0.85, 0.95), 2)
    }
