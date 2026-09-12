from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/buildings", tags=["buildings"], dependencies=[Depends(auth.get_current_user)])

@router.get("/", response_model=List[schemas.Building])
def read_buildings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    buildings = db.query(models.Building).offset(skip).limit(limit).all()
    return buildings

@router.get("/locations", response_model=List[schemas.Location])
def read_locations(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    locations = db.query(models.Location).offset(skip).limit(limit).all()
    return locations

@router.get("/{building_id}", response_model=schemas.Building)
def read_building(building_id: int, db: Session = Depends(get_db)):
    db_building = db.query(models.Building).filter(models.Building.id == building_id).first()
    if db_building is None:
        raise HTTPException(status_code=404, detail="Building not found")
    return db_building

@router.post("/", response_model=schemas.Building, status_code=status.HTTP_201_CREATED)
def create_building(building: schemas.BuildingCreate, db: Session = Depends(get_db)):
    db_building = models.Building(**building.model_dump())
    db.add(db_building)
    db.commit()
    db.refresh(db_building)
    return db_building

@router.put("/{building_id}", response_model=schemas.Building)
def update_building(building_id: int, building_update: schemas.BuildingBase, db: Session = Depends(get_db)):
    db_building = db.query(models.Building).filter(models.Building.id == building_id).first()
    if not db_building:
        raise HTTPException(status_code=404, detail="Building not found")
        
    for key, value in building_update.model_dump().items():
        setattr(db_building, key, value)
        
    db.commit()
    db.refresh(db_building)
    return db_building

@router.delete("/{building_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_building(building_id: int, db: Session = Depends(get_db)):
    db_building = db.query(models.Building).filter(models.Building.id == building_id).first()
    if not db_building:
        raise HTTPException(status_code=404, detail="Building not found")
        
    db.delete(db_building)
    db.commit()
    return None
