import random
from datetime import datetime, timedelta
import uuid
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from auth import get_password_hash

# -------------------------------------------------------------
# Brainware University Campus Buildings & Geographic Bounds
# -------------------------------------------------------------
BUILDINGS_CONFIG = [
    {
        "name": "Central Library",
        "description": "Central Library & Digital Archives (Building 01 · 4 Floors)",
        "lat": 22.73253,
        "lon": 88.49872,
        "floors": 4,
        "width": 39.0,
        "depth": 57.5,
        "bounds": {
            "min_lat": 22.73226,
            "max_lat": 22.73280,
            "min_lon": 88.49852,
            "max_lon": 88.49892,
        }
    },
    {
        "name": "Main Academic Building",
        "description": "Main Academic Administration & Smart Classrooms (Building 02 · 6 Floors)",
        "lat": 22.73314,
        "lon": 88.49931,
        "floors": 6,
        "width": 94.5,
        "depth": 50.0,
        "bounds": {
            "min_lat": 22.73290,
            "max_lat": 22.73338,
            "min_lon": 88.49885,
            "max_lon": 88.49977,
        }
    },
    {
        "name": "Engineering Block",
        "description": "Faculty of Engineering & Technology (Building 03 · 9 Floors)",
        "lat": 22.73335,
        "lon": 88.50054,
        "floors": 9,
        "width": 69.8,
        "depth": 69.8,
        "bounds": {
            "min_lat": 22.73302,
            "max_lat": 22.73368,
            "min_lon": 88.50020,
            "max_lon": 88.50088,
        }
    },
    {
        "name": "Law & Management",
        "description": "School of Law, Management & Humanities (Building 04 · 4 Floors)",
        "lat": 22.73228,
        "lon": 88.50081,
        "floors": 4,
        "width": 63.6,
        "depth": 74.2,
        "bounds": {
            "min_lat": 22.73193,
            "max_lat": 22.73262,
            "min_lon": 88.50050,
            "max_lon": 88.50112,
        }
    },
    {
        "name": "Allied Health Sciences",
        "description": "School of Medical, Nursing & Health Sciences (Building 05 · 3 Floors)",
        "lat": 22.73164,
        "lon": 88.50008,
        "floors": 3,
        "width": 68.8,
        "depth": 49.8,
        "bounds": {
            "min_lat": 22.73140,
            "max_lat": 22.73188,
            "min_lon": 88.49975,
            "max_lon": 88.50042,
        }
    },
    {
        "name": "Food Court & Canteen",
        "description": "Campus Student Amenities & Food Court (Building 06 · 1 Floor)",
        "lat": 22.73161,
        "lon": 88.49908,
        "floors": 1,
        "width": 58.5,
        "depth": 44.3,
        "bounds": {
            "min_lat": 22.73140,
            "max_lat": 22.73182,
            "min_lon": 88.49880,
            "max_lon": 88.49937,
        }
    },
]

def seed_data():
    print("Re-creating all database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # -------------------------------------------------------------
        # 1. Multi-Admin Users & Technicians
        # -------------------------------------------------------------
        admin_user = models.User(
            email="admin@firetwin.edu",
            hashed_password=get_password_hash("joy9123"),
            full_name="Chief Safety Administrator",
            role="super_admin",
            status="active",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        operator_user = models.User(
            email="operator@firetwin.edu",
            hashed_password=get_password_hash("operator123"),
            full_name="Campus Safety Officer",
            role="admin",
            status="active",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=30)
        )
        tech_user = models.User(
            email="tech@firetwin.edu",
            hashed_password=get_password_hash("tech123"),
            full_name="Lead Fire Safety Technician",
            role="technician",
            status="active",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=45)
        )
        db.add_all([admin_user, operator_user, tech_user])
        db.commit()
        db.refresh(admin_user)
        db.refresh(operator_user)
        db.refresh(tech_user)
        print("✅ Created Super Admin, Admin Operator, and Technician users.")

        # -------------------------------------------------------------
        # 2. Buildings & Floor Locations
        # -------------------------------------------------------------
        db_buildings = []
        building_map = {}
        for b_cfg in BUILDINGS_CONFIG:
            bldg = models.Building(
                name=b_cfg["name"],
                description=b_cfg["description"],
                latitude=b_cfg["lat"],
                longitude=b_cfg["lon"],
                floors=b_cfg["floors"],
                width=b_cfg["width"],
                depth=b_cfg["depth"],
                floor_height=3.2
            )
            db.add(bldg)
            db.commit()
            db.refresh(bldg)
            db_buildings.append(bldg)
            building_map[b_cfg["name"]] = {"model": bldg, "cfg": b_cfg}

        # Create locations for every floor of each building
        floor_locations_by_building = {}
        all_floor_locations = []
        for b_name, b_info in building_map.items():
            b_model = b_info["model"]
            b_cfg = b_info["cfg"]
            floor_locations_by_building[b_model.id] = {}
            
            for floor_idx in range(b_cfg["floors"]):
                loc_name = "Ground Floor" if floor_idx == 0 else f"Floor {floor_idx}"
                loc = models.Location(
                    building_id=b_model.id,
                    name=f"{b_model.name} — {loc_name}",
                    location_type="FLOOR",
                    capacity=10,
                    floor=str(floor_idx),
                    block="Main"
                )
                db.add(loc)
                db.commit()
                db.refresh(loc)
                floor_locations_by_building[b_model.id][floor_idx] = loc
                all_floor_locations.append((b_model, floor_idx, loc, b_cfg))

        # Create Central Storage Locations
        storage_locations = []
        storage_depots = [
            "Central Safety Logistics Depot (Depot A)",
            "Reserve Storage Vault (Depot B)",
            "Campus Maintenance Workshop Storage"
        ]
        for s_name in storage_depots:
            s_loc = models.Location(
                building_id=None,
                name=s_name,
                location_type="STORAGE",
                capacity=50,
                floor="0",
                block="Storage"
            )
            db.add(s_loc)
            storage_locations.append(s_loc)
        db.commit()
        for sl in storage_locations:
            db.refresh(sl)
            
        print(f"✅ Created {len(db_buildings)} Buildings and {len(all_floor_locations)} Floor Locations + {len(storage_locations)} Storage Depots.")

        # -------------------------------------------------------------
        # 3. Active Fire Extinguishers (100 Deployed Units)
        # -------------------------------------------------------------
        # Distribute 100 units across all floors of all 6 buildings
        # Building floor counts: Library(4), Main(6), Eng(9), Law(4), Health(3), Canteen(1) = Total 27 floors
        ext_types = ["Dry Chemical", "CO2", "Foam", "Water", "Clean Agent"]
        capacities = ["2kg", "4kg", "5kg", "6kg", "9kg"]
        
        # Plan units per floor so every floor has between 2 and 6 units
        # Total floors: 27 floors. Let's allocate 100 units across them:
        # Eng Block (9 floors): ~32 units (3-4 per floor)
        # Main Academic (6 floors): ~24 units (4 per floor)
        # Central Library (4 floors): ~16 units (4 per floor)
        # Law & Mgmt (4 floors): ~14 units (3-4 per floor)
        # Health Sciences (3 floors): ~10 units (3-4 per floor)
        # Food Court (1 floor): ~4 units
        # Total = 32 + 24 + 16 + 14 + 10 + 4 = 100 units!

        building_unit_quotas = {
            "Engineering Block": 32,
            "Main Academic Building": 24,
            "Central Library": 16,
            "Law & Management": 14,
            "Allied Health Sciences": 10,
            "Food Court & Canteen": 4
        }

        active_extinguishers = []
        ext_counter = 1001
        
        for b_name, quota in building_unit_quotas.items():
            b_info = building_map[b_name]
            b_model = b_info["model"]
            b_cfg = b_info["cfg"]
            floors_count = b_cfg["floors"]
            bounds = b_cfg["bounds"]
            
            # Distribute quota evenly across floors
            base_per_floor = quota // floors_count
            remainder = quota % floors_count
            
            for floor_idx in range(floors_count):
                units_on_this_floor = base_per_floor + (1 if floor_idx < remainder else 0)
                loc = floor_locations_by_building[b_model.id][floor_idx]
                
                for u_idx in range(units_on_this_floor):
                    # Deterministic, non-overlapping coordinate generation within building bounds
                    lat_span = bounds["max_lat"] - bounds["min_lat"]
                    lon_span = bounds["max_lon"] - bounds["min_lon"]
                    
                    # Margin of 15% inside the walls
                    pad_lat = lat_span * 0.15
                    pad_lon = lon_span * 0.15
                    
                    if units_on_this_floor == 1:
                        u_lat = bounds["min_lat"] + lat_span * 0.5
                        u_lon = bounds["min_lon"] + lon_span * 0.5
                    else:
                        radius_lat = (lat_span * 0.5) - pad_lat
                        radius_lon = (lon_span * 0.5) - pad_lon
                        angle = (u_idx / units_on_this_floor) * 2.0 * 3.14159265
                        u_lat = (bounds["min_lat"] + lat_span * 0.5) + (radius_lat * 0.85 * random.uniform(0.6, 1.0)) * (1 if u_idx % 2 == 0 else -1) * (u_idx / units_on_this_floor)
                        u_lon = (bounds["min_lon"] + lon_span * 0.5) + (radius_lon * 0.85 * random.uniform(0.6, 1.0)) * (1 if (u_idx // 2) % 2 == 0 else -1)
                        
                        # Clamp strictly within bounds with safety margin
                        u_lat = max(bounds["min_lat"] + pad_lat, min(bounds["max_lat"] - pad_lat, u_lat))
                        u_lon = max(bounds["min_lon"] + pad_lon, min(bounds["max_lon"] - pad_lon, u_lon))

                    # Status distribution: 82% Healthy, 10% Low Pressure / Attention, 5% Maintenance Due, 3% Critical/Emergency
                    rand_val = random.random()
                    if rand_val < 0.82:
                        status = "Healthy"
                        pressure = round(random.uniform(88.0, 100.0), 1)
                        battery = round(random.uniform(70.0, 100.0), 1)
                    elif rand_val < 0.92:
                        status = "Low Pressure"
                        pressure = round(random.uniform(28.0, 39.5), 1)
                        battery = round(random.uniform(30.0, 65.0), 1)
                    elif rand_val < 0.97:
                        status = "Maintenance Due"
                        pressure = round(random.uniform(45.0, 75.0), 1)
                        battery = round(random.uniform(25.0, 50.0), 1)
                    else:
                        status = "Emergency"
                        pressure = round(random.uniform(12.0, 24.0), 1)
                        battery = round(random.uniform(15.0, 40.0), 1)

                    install_date = datetime.utcnow() - timedelta(days=random.randint(120, 800))
                    expiry_date = install_date + timedelta(days=365 * 5)
                    last_insp = datetime.utcnow() - timedelta(days=random.randint(5, 60))
                    next_insp = last_insp + timedelta(days=180)

                    e_type = random.choice(ext_types)
                    cap = random.choice(capacities)
                    room_no = f"Room {floor_idx * 100 + random.randint(1, 20)}" if floor_idx > 0 else f"Lobby / Corridor G-{random.randint(1, 9)}"

                    ext = models.FireExtinguisher(
                        extinguisher_id=f"FE-{ext_counter}",
                        serial_number=f"BWU-{ext_counter}-{uuid.uuid4().hex[:4].upper()}",
                        location_id=loc.id,
                        room=room_no,
                        type=e_type,
                        capacity=cap,
                        pressure=pressure,
                        rfid_tag=f"RFID-BWU-{ext_counter}",
                        esp32_device_id=f"ESP32-BWU-{ext_counter}",
                        installation_date=install_date,
                        expiry_date=expiry_date,
                        last_inspection_date=last_insp,
                        next_inspection_date=next_insp,
                        status=status,
                        lifecycle_state="ACTIVE",
                        battery=battery,
                        weight=float(cap.replace("kg", "")) + random.uniform(1.5, 2.5),
                        temperature=round(random.uniform(22.0, 28.5), 1),
                        latitude=round(u_lat, 6),
                        longitude=round(u_lon, 6)
                    )
                    active_extinguishers.append(ext)
                    ext_counter += 1

        db.add_all(active_extinguishers)
        db.commit()
        for ext in active_extinguishers:
            db.refresh(ext)
        print(f"✅ Created {len(active_extinguishers)} Active Extinguishers positioned inside building footprints.")

        # -------------------------------------------------------------
        # 4. Storage Pool Units (25 Spare Units)
        # -------------------------------------------------------------
        storage_extinguishers = []
        spare_types = ["CO2", "Dry Chemical", "Foam", "Water", "Clean Agent"]
        spare_caps = ["2kg", "4kg", "5kg", "6kg", "9kg", "12kg"]

        for i in range(25):
            s_type = spare_types[i % len(spare_types)]
            s_cap = spare_caps[i % len(spare_caps)]
            s_loc = storage_locations[i % len(storage_locations)]
            
            # Most spare units are full and nominal; 2 or 3 are scheduled for recharge/expired
            if i < 20:
                s_status = "Healthy"
                s_pressure = 100.0
                s_battery = round(random.uniform(85.0, 100.0), 1)
            elif i < 23:
                s_status = "Maintenance Due"
                s_pressure = round(random.uniform(40.0, 60.0), 1)
                s_battery = round(random.uniform(40.0, 70.0), 1)
            else:
                s_status = "Inspection Pending"
                s_pressure = 95.0
                s_battery = round(random.uniform(60.0, 85.0), 1)

            install_date = datetime.utcnow() - timedelta(days=random.randint(30, 365))
            expiry_date = install_date + timedelta(days=365 * 5)
            last_insp = datetime.utcnow() - timedelta(days=random.randint(10, 45))

            spare_ext = models.FireExtinguisher(
                extinguisher_id=f"FE-SPARE-{2001 + i}",
                serial_number=f"BWU-SPARE-{2001 + i}-{uuid.uuid4().hex[:4].upper()}",
                location_id=s_loc.id,
                room=f"Rack {chr(65 + (i % 6))}-Section {1 + (i % 4)}",
                type=s_type,
                capacity=s_cap,
                pressure=s_pressure,
                rfid_tag=f"RFID-SPARE-{2001 + i}",
                esp32_device_id=f"ESP32-SPARE-{2001 + i}",
                installation_date=install_date,
                expiry_date=expiry_date,
                last_inspection_date=last_insp,
                next_inspection_date=last_insp + timedelta(days=180),
                status=s_status,
                lifecycle_state="IN_STORAGE",
                battery=s_battery,
                weight=float(s_cap.replace("kg", "")) + 2.0,
                temperature=24.0,
                latitude=None,
                longitude=None
            )
            storage_extinguishers.append(spare_ext)

        db.add_all(storage_extinguishers)
        db.commit()
        for se in storage_extinguishers:
            db.refresh(se)
        print(f"✅ Created {len(storage_extinguishers)} Spare Extinguishers in Storage Pool.")

        # -------------------------------------------------------------
        # 5. Initial IoT Telemetry Readings History (Recent 30 readings)
        # -------------------------------------------------------------
        readings = []
        for i, ext in enumerate(active_extinguishers[:30]):
            t_offset = timedelta(minutes=(30 - i) * 2)
            reading = models.IoTReading(
                extinguisher_id=ext.id,
                pressure=ext.pressure,
                temperature=ext.temperature,
                weight=ext.weight,
                tilt=False,
                availability=True,
                device_health="Good" if ext.status == "Healthy" else "Warning",
                timestamp=datetime.utcnow() - t_offset
            )
            readings.append(reading)
        
        db.add_all(readings)
        db.commit()
        print(f"✅ Created {len(readings)} initial IoT telemetry readings.")

        # -------------------------------------------------------------
        # 6. Default Settings
        # -------------------------------------------------------------
        settings_data = [
            ("maintenance", "low_pressure_threshold", "40.0"),
            ("maintenance", "auto_work_order", "true"),
            ("general", "campus_name", "Brainware University"),
            ("general", "emergency_hotline", "+91 33 7144 5555"),
        ]
        for cat, key, val in settings_data:
            s = models.Setting(category=cat, key=key, value=val)
            db.add(s)
        db.commit()
        print("✅ Seeded default settings.")

        print("\n🎉 Full Database Seeding Completed Successfully!")
        print(f"Total Extinguishers: {len(active_extinguishers) + len(storage_extinguishers)} (Active: {len(active_extinguishers)}, Storage Pool: {len(storage_extinguishers)})")

    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
