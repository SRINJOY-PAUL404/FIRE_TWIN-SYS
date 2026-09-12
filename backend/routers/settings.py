from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import models, schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(get_current_user)])

@router.get("/{category}", response_model=Dict[str, Any])
def read_settings(category: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    settings = db.query(models.Setting).filter(models.Setting.category == category).all()
    return {s.key: s.value for s in settings}

@router.put("/{category}", response_model=Dict[str, Any])
def update_settings(category: str, payload: Dict[str, Any], db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # RBAC check
    if category in ['iot_mqtt', 'security'] and current_user.role not in ['super_admin', 'CMD_ADMIN']:
        raise HTTPException(status_code=403, detail="Super administrator permissions required")

        
    errors = []
    
    # Validation logic
    if category == 'maintenance':
        for k, v in payload.items():
            if 'threshold' in k or 'interval' in k:
                try:
                    val = float(v)
                    if 'threshold' in k and (val < 0 or val > 100):
                        errors.append({"field": k, "message": "Threshold must be between 0 and 100"})
                    elif val < 0:
                        errors.append({"field": k, "message": "Must be a positive number"})
                except ValueError:
                    errors.append({"field": k, "message": "Must be a valid number"})
    
    elif category == 'preferences':
        if 'theme' in payload and payload['theme'] not in ['dark', 'light']:
            errors.append({"field": "theme", "message": "Theme must be 'dark' or 'light'"})
        if 'default_view' in payload and payload['default_view'] not in ['DASHBOARD', 'BLUEPRINT', 'INVENTORY']:
            errors.append({"field": "default_view", "message": "Invalid default view"})
        if 'units' in payload and payload['units'] not in ['psi', 'bar']:
            errors.append({"field": "units", "message": "Units must be 'psi' or 'bar'"})
                    
    if errors:
        raise HTTPException(status_code=422, detail=errors)
        
    for k, v in payload.items():
        db_setting = db.query(models.Setting).filter(models.Setting.category == category, models.Setting.key == k).first()
        if db_setting:
            db_setting.value = str(v)
        else:
            new_setting = models.Setting(category=category, key=k, value=str(v))
            db.add(new_setting)
            
    db.commit()
    
    updated = db.query(models.Setting).filter(models.Setting.category == category).all()
    return {s.key: s.value for s in updated}
