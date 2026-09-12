import random
from datetime import datetime, timedelta
import uuid
from database import SessionLocal
import models

def add_units():
    db = SessionLocal()
    try:
        building = db.query(models.Building).filter(models.Building.name == "Engineering Block").first()
        if not building:
            print("Engineering Block not found!")
            return
            
        types = ["CO2", "Water", "Foam", "Dry Chemical"]
        extinguishers = []
        
        # We need to find the max extinguisher_id so we don't collide
        all_exts = db.query(models.FireExtinguisher).all()
        max_i = 100
        for e in all_exts:
            if e.extinguisher_id.startswith("FE-"):
                try:
                    num = int(e.extinguisher_id.split("-")[1])
                    if num > max_i:
                        max_i = num
                except:
                    pass
                    
        current_i = max_i
        
        for floor in [6, 7, 8]:
            for _ in range(5):
                current_i += 1
                installation_date = datetime.now() - timedelta(days=random.randint(100, 1000))
                expiry_date = installation_date + timedelta(days=365*5)
                
                extinguisher = models.FireExtinguisher(
                    extinguisher_id=f"FE-{current_i}",
                    serial_number=str(uuid.uuid4())[:8].upper(),
                    building_id=building.id,
                    block="Eng",
                    floor=str(floor),
                    room=f"Rm {floor}0{random.randint(1, 9)}",
                    type=random.choice(types),
                    capacity=random.choice(["2kg", "5kg", "9kg"]),
                    pressure=100.0,
                    rfid_tag=f"RFID-{current_i*10}",
                    esp32_device_id=f"ESP32-{current_i*10}",
                    installation_date=installation_date,
                    expiry_date=expiry_date,
                    last_inspection_date=datetime.now() - timedelta(days=random.randint(1, 30)),
                    next_inspection_date=datetime.now() + timedelta(days=random.randint(-10, 30)),
                    status="Healthy",
                    battery=random.uniform(80.0, 100.0),
                    latitude=building.latitude + random.uniform(-0.0005, 0.0005),
                    longitude=building.longitude + random.uniform(-0.0005, 0.0005)
                )
                extinguishers.append(extinguisher)
                
        db.add_all(extinguishers)
        db.commit()
        print(f"Successfully added 15 units to Engineering Block floors 6, 7, 8.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_units()
