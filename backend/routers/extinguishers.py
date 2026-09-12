from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/extinguishers", tags=["extinguishers"], dependencies=[Depends(auth.get_current_user)])

@router.get("/", response_model=List[schemas.FireExtinguisher])
def read_extinguishers(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    extinguishers = db.query(models.FireExtinguisher).offset(skip).limit(limit).all()
    return extinguishers

@router.get("/telemetry/recent")
def get_recent_telemetry(limit: int = 20, db: Session = Depends(get_db)):
    readings = db.query(models.IoTReading).order_by(models.IoTReading.timestamp.desc()).limit(limit).all()
    results = []
    for r in readings:
        ext = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.id == r.extinguisher_id).first()
        loc = db.query(models.Location).filter(models.Location.id == ext.location_id).first() if ext and ext.location_id else None
        bldg = db.query(models.Building).filter(models.Building.id == loc.building_id).first() if loc and loc.building_id else None
        
        results.append({
            "type": "UPDATE",
            "reading_id": r.id,
            "extinguisher_id": r.extinguisher_id,
            "device_id": ext.esp32_device_id if ext else f"DEV-{r.extinguisher_id}",
            "extinguisher_code": ext.extinguisher_id if ext else f"FE-{r.extinguisher_id}",
            "building_name": bldg.name if bldg else "Campus Central",
            "location_name": loc.name if loc else "Storage / Reserve",
            "room": ext.room if ext else "",
            "pressure": r.pressure,
            "battery": ext.battery if ext else 100.0,
            "temperature": r.temperature,
            "tilt": r.tilt,
            "status": ext.status if ext else "Healthy",
            "timestamp": r.timestamp.isoformat() if r.timestamp else datetime.utcnow().isoformat()
        })
    return results

@router.get("/{extinguisher_id}", response_model=schemas.FireExtinguisher)
def read_extinguisher(extinguisher_id: int, db: Session = Depends(get_db)):
    db_extinguisher = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.id == extinguisher_id).first()
    if db_extinguisher is None:
        raise HTTPException(status_code=404, detail="Extinguisher not found")
    return db_extinguisher

@router.post("/", response_model=schemas.FireExtinguisher, status_code=status.HTTP_201_CREATED)
def create_extinguisher(extinguisher: schemas.FireExtinguisherCreate, db: Session = Depends(get_db)):
    if extinguisher.location_id and extinguisher.lifecycle_state == "ACTIVE":
        loc = db.query(models.Location).filter(models.Location.id == extinguisher.location_id).first()
        if loc and loc.location_type == "FLOOR" and loc.capacity is not None:
            active_count = db.query(models.FireExtinguisher).filter(
                models.FireExtinguisher.location_id == extinguisher.location_id,
                models.FireExtinguisher.lifecycle_state == "ACTIVE"
            ).count()
            if active_count >= loc.capacity:
                raise HTTPException(status_code=400, detail=f"Location '{loc.name}' has reached its capacity of {loc.capacity} active units")
                
    db_extinguisher = models.FireExtinguisher(**extinguisher.model_dump())
    db.add(db_extinguisher)
    db.commit()
    db.refresh(db_extinguisher)
    return db_extinguisher

@router.put("/{extinguisher_id}", response_model=schemas.FireExtinguisher)
def update_extinguisher(extinguisher_id: int, ext_in: schemas.FireExtinguisherUpdate, db: Session = Depends(get_db)):
    db_ext = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.id == extinguisher_id).first()
    if not db_ext:
        raise HTTPException(status_code=404, detail="Extinguisher not found")
        
    new_loc_id = ext_in.location_id if ext_in.location_id is not None else db_ext.location_id
    new_state = ext_in.lifecycle_state if ext_in.lifecycle_state is not None else db_ext.lifecycle_state
    
    if new_state == "ACTIVE" and new_loc_id:
        loc = db.query(models.Location).filter(models.Location.id == new_loc_id).first()
        if loc and loc.location_type == "FLOOR" and loc.capacity is not None:
            active_count = db.query(models.FireExtinguisher).filter(
                models.FireExtinguisher.location_id == new_loc_id,
                models.FireExtinguisher.lifecycle_state == "ACTIVE",
                models.FireExtinguisher.id != extinguisher_id
            ).count()
            if active_count >= loc.capacity:
                raise HTTPException(status_code=400, detail=f"Location '{loc.name}' has reached its capacity of {loc.capacity} active units")
                
    update_data = ext_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_ext, key, value)
        
    db.commit()
    db.refresh(db_ext)
    return db_ext

@router.post("/{extinguisher_id}/maintain", response_model=schemas.FireExtinguisher)
def perform_maintenance(extinguisher_id: int, db: Session = Depends(get_db)):
    db_extinguisher = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.id == extinguisher_id).first()
    if db_extinguisher is None:
        raise HTTPException(status_code=404, detail="Extinguisher not found")
    
    db_extinguisher.status = "Healthy"
    db_extinguisher.pressure = 100.0
    db_extinguisher.last_inspection_date = datetime.utcnow()
    db_extinguisher.next_inspection_date = datetime.utcnow() + timedelta(days=365)
    
    db.commit()
    db.refresh(db_extinguisher)
    return db_extinguisher

@router.post("/{extinguisher_id}/ai-inspect")
def perform_ai_inspection(extinguisher_id: int, db: Session = Depends(get_db)):
    db_extinguisher = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.id == extinguisher_id).first()
    if db_extinguisher is None:
        raise HTTPException(status_code=404, detail="Extinguisher not found")
    
    # Mock AI Analysis
    analysis_result = {
        "problem_detected": "Minor seal leak causing slow pressure loss.",
        "recommended_action": "Replaced O-ring seal and repressurized unit to 100%.",
        "ai_confidence": 0.98
    }
    
    db_extinguisher.status = "Healthy"
    db_extinguisher.pressure = 100.0
    db_extinguisher.last_inspection_date = datetime.utcnow()
    db_extinguisher.next_inspection_date = datetime.utcnow() + timedelta(days=180) # 6 months for fixed leaks
    
    db.commit()
    db.refresh(db_extinguisher)
    
    return {"extinguisher": db_extinguisher, "analysis": analysis_result}
