import random
from datetime import datetime, timedelta
from faker import Faker
from sqlalchemy.orm import Session
from passlib.context import CryptContext

# Import models and db setup
from database import engine, SessionLocal, Base
from models import User, Building, Location, FireExtinguisher, IoTReading, Alert, MaintenanceLog

# Set fixed seeds for reproducibility
fake = Faker()
Faker.seed(42)
random.seed(42)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed_data():
    """
    Main function to truncate existing tables and generate realistic seed data 
    for the FireTwin AI digital twin dashboard.
    """
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables from scratch...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # ==========================================
        # 1. Users (15-20 records)
        # ==========================================
        users = []
        
        # Generate 2 Admins
        for _ in range(2):
            u = User(
                email=fake.unique.email(),
                hashed_password=get_password_hash("admin123"),
                full_name=fake.name(),
                role="Admin",
                is_active=True
            )
            users.append(u)
        
        for _ in range(16):
            u = User(
                email=fake.unique.email(),
                hashed_password=get_password_hash("staff123"),
                full_name=fake.name(),
                role=random.choice(["Safety Officer", "Maintenance Staff", "Maintenance Staff"]),
                is_active=True
            )
            users.append(u)
            
        db.add_all(users)
        db.commit()
        for u in users:
            db.refresh(u)
        
        technicians = [u for u in users if u.role == "Maintenance Staff"]
        print(f"✅ Inserted {len(users)} Users")
        
        # ==========================================
        # 2. Buildings & Locations
        # ==========================================
        building_names = ["Engineering Block", "Central Library", "Science Complex", "Admin Block"]
        buildings = []
        locations = []
        
        for b_name in building_names:
            b = Building(
                name=b_name,
                description=fake.catch_phrase(),
                latitude=40.7128 + random.uniform(-0.01, 0.01),
                longitude=-74.0060 + random.uniform(-0.01, 0.01),
                floors=5
            )
            db.add(b)
            db.commit()
            db.refresh(b)
            buildings.append(b)
            
            # Create Floors
            for f in range(1, 6):
                loc = Location(
                    building_id=b.id,
                    name=f"Floor {f}",
                    location_type="FLOOR",
                    capacity=5,
                    floor=str(f)
                )
                db.add(loc)
                locations.append(loc)
            
            # Create Storage Room
            storage_loc = Location(
                building_id=b.id,
                name=f"Storage Room - {b_name}",
                location_type="STORAGE",
                capacity=None
            )
            db.add(storage_loc)
            locations.append(storage_loc)
            
        db.commit()
        print(f"✅ Inserted {len(buildings)} Buildings and {len(locations)} Locations")
        
        # ==========================================
        # 3. Extinguishers (115 records)
        # ==========================================
        extinguishers = []
        ext_types = ["CO2", "Foam", "Water", "Dry Chemical"]
        
        floor_locations = [loc for loc in locations if loc.location_type == "FLOOR"]
        storage_locations = [loc for loc in locations if loc.location_type == "STORAGE"]
        
        # Assign 100 to floors (5 per floor, across 20 floors)
        # Assign 15 to storage
        active_count = 0
        storage_count = 0
        
        for i in range(115):
            ext_type = random.choice(ext_types)
            install_date = fake.date_time_between(start_date='-5y', end_date='-1y')
            expiry_date = install_date + timedelta(days=365 * 10)
            last_insp = fake.date_time_between(start_date='-1y', end_date='now')
            next_insp = last_insp + timedelta(days=365)
            
            # Decide if ACTIVE or IN_STORAGE
            if active_count < 100:
                loc = floor_locations[active_count // 5]
                lifecycle = "ACTIVE"
                active_count += 1
            else:
                loc = random.choice(storage_locations)
                lifecycle = "IN_STORAGE"
                storage_count += 1
                
            is_degrading = random.random() < 0.1 and lifecycle == "ACTIVE"
            
            if is_degrading:
                pressure = random.uniform(20.0, 60.0)
                status = "Maintenance Due"
            else:
                pressure = random.uniform(90.0, 100.0)
                status = "Healthy"
                
            if not is_degrading and lifecycle == "ACTIVE" and random.random() < 0.05:
                status = random.choice(["Inspection Pending", "Missing"])
                if status == "Missing":
                    pressure = 0.0
                    
            if lifecycle == "IN_STORAGE":
                status = "Healthy"
                pressure = 100.0
            
            b = db.query(Building).filter(Building.id == loc.building_id).first()
            
            ext = FireExtinguisher(
                extinguisher_id=f"FE-{b.name[:3].upper()}-{fake.unique.random_int(min=1000, max=9999)}",
                serial_number=fake.unique.ean(length=13),
                location_id=loc.id,
                room=f"Room {random.randint(100, 699)}",
                type=ext_type,
                capacity=random.choice(["2kg", "5kg", "9kg", "9L"]),
                pressure=pressure,
                rfid_tag=fake.hexify(text="^" * 16),
                esp32_device_id=f"ESP32-{fake.unique.hexify(text='^' * 8)}",
                installation_date=install_date,
                expiry_date=expiry_date,
                last_inspection_date=last_insp,
                next_inspection_date=next_insp,
                status=status,
                lifecycle_state=lifecycle,
                latitude=b.latitude + random.uniform(-0.0005, 0.0005) if b else 0.0,
                longitude=b.longitude + random.uniform(-0.0005, 0.0005) if b else 0.0
            )
            extinguishers.append(ext)
            db.add(ext)
            
        db.commit()
        for ext in extinguishers:
            db.refresh(ext)
            
        print(f"✅ Inserted {len(extinguishers)} Fire Extinguishers (100 Active, 15 Storage)")
        
        # ==========================================
        # 4. IoT Readings (Only for ACTIVE)
        # ==========================================
        readings = []
        now = datetime.utcnow()
        active_exts = [e for e in extinguishers if e.lifecycle_state == "ACTIVE"]
        
        for ext in active_exts:
            num_readings = random.randint(3, 8)
            is_degrading = ext.pressure < 80.0
            
            for j in range(num_readings):
                reading_time = now - timedelta(days=random.randint(1, 30), hours=random.randint(0, 23))
                days_ago = (now - reading_time).days
                
                if is_degrading:
                    if days_ago < 15:
                        current_pressure = max(ext.pressure, 100.0 - (15 - days_ago) * random.uniform(2.0, 4.0))
                    else:
                        current_pressure = random.uniform(95.0, 100.0)
                else:
                    current_pressure = random.uniform(95.0, 100.0)
                
                reading = IoTReading(
                    extinguisher_id=ext.id,
                    pressure=current_pressure,
                    temperature=random.uniform(18.0, 32.0),
                    weight=random.uniform(4.5, 5.5),
                    tilt=random.random() < 0.02,
                    availability=True,
                    device_health="Good" if current_pressure > 50 else "Warning",
                    timestamp=reading_time
                )
                readings.append(reading)
        
        db.add_all(readings)
        db.commit()
        print(f"✅ Inserted {len(readings)} IoT Readings")
        
        # ==========================================
        # 5. Alerts
        # ==========================================
        alerts = []
        for _ in range(30):
            ext = random.choice(active_exts)
            
            if ext.status == "Maintenance Due":
                atype = "Pressure Low"
                message = f"Critical: Pressure critically low on {ext.extinguisher_id}. Leak suspected."
            elif ext.status == "Missing":
                atype = "Missing"
                message = f"High: Extinguisher {ext.extinguisher_id} removed from designated location."
            else:
                atype = random.choice(["Device Offline", "Expiry", "Tilt"])
                message = f"Info: {atype} alert for {ext.extinguisher_id}."
                
            is_resolved = random.choice([True, False])
            
            alert = Alert(
                extinguisher_id=ext.id,
                type=atype,
                message=message,
                is_resolved=is_resolved,
                timestamp=now - timedelta(days=random.randint(0, 10), hours=random.randint(0, 23))
            )
            alerts.append(alert)
            
        db.add_all(alerts)
        db.commit()
        print(f"✅ Inserted {len(alerts)} Alerts")
        
        # ==========================================
        # 6. Maintenance Logs
        # ==========================================
        maintenance_logs = []
        for _ in range(40):
            ext = random.choice(extinguishers)
            tech = random.choice(technicians) if technicians else None
            
            status = random.choice(["Pending", "Completed"])
            sched_date = now - timedelta(days=random.randint(-15, 15))
            comp_date = sched_date + timedelta(days=random.randint(1, 3)) if status == "Completed" else None
            
            log = MaintenanceLog(
                extinguisher_id=ext.id,
                technician_id=tech.id if tech else None,
                task_description=random.choice(["Routine Inspection", "Refill", "Repair", "Replacement"]),
                status=status,
                notes=fake.sentence() if status == "Completed" else None,
                scheduled_date=sched_date,
                completed_date=comp_date
            )
            maintenance_logs.append(log)
            
        db.add_all(maintenance_logs)
        db.commit()
        print(f"✅ Inserted {len(maintenance_logs)} Maintenance Logs")
        
        print("\n🎉 Seed data generation completed successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
