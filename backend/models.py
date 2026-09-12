from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="admin") # super_admin, admin, technician, viewer, CMD_ADMIN
    status = Column(String, default="active") # active, disabled
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    @property
    def name(self):
        return self.full_name or (self.email.split("@")[0] if self.email else "Admin")

    @name.setter
    def name(self, value):
        self.full_name = value

    @property
    def password_hash(self):
        return self.hashed_password

    @password_hash.setter
    def password_hash(self, value):
        self.hashed_password = value


class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    masked_key = Column(String)
    hashed_key = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Building(Base):
    __tablename__ = "buildings"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    blocks = Column(JSON, default=list)
    width = Column(Float, default=10.0)
    depth = Column(Float, default=10.0)
    floors = Column(Integer, default=1)
    floor_height = Column(Float, default=3.0)
    
    locations = relationship("Location", back_populates="building")

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    name = Column(String) # e.g. "Floor 1", "Global Storage"
    location_type = Column(String, default="FLOOR") # FLOOR, STORAGE
    capacity = Column(Integer, nullable=True, default=5) # Default 5 for FLOOR, null for STORAGE
    block = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    
    building = relationship("Building", back_populates="locations")
    extinguishers = relationship("FireExtinguisher", back_populates="location")

class FireExtinguisher(Base):
    __tablename__ = "fire_extinguishers"
    id = Column(Integer, primary_key=True, index=True)
    extinguisher_id = Column(String, unique=True, index=True)
    serial_number = Column(String)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    room = Column(String)
    type = Column(String) # CO2, Foam, Water, Dry Chemical
    capacity = Column(String)
    pressure = Column(Float, default=100.0) # percentage
    rfid_tag = Column(String, nullable=True)
    esp32_device_id = Column(String, unique=True, index=True)
    installation_date = Column(DateTime)
    expiry_date = Column(DateTime)
    last_inspection_date = Column(DateTime, nullable=True)
    next_inspection_date = Column(DateTime, nullable=True)
    status = Column(String, default="Healthy") # Healthy, Maintenance Due, Missing, Inspection Pending
    lifecycle_state = Column(String, default="ACTIVE") # ACTIVE, IN_STORAGE, UNDER_MAINTENANCE, DECOMMISSIONED
    battery = Column(Float, default=100.0)
    weight = Column(Float, default=5.0)
    temperature = Column(Float, default=25.0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    local_x = Column(Float, nullable=True)
    local_z = Column(Float, nullable=True)
    
    location = relationship("Location", back_populates="extinguishers")
    readings = relationship("IoTReading", back_populates="extinguisher")
    alerts = relationship("Alert", back_populates="extinguisher")
    maintenance_logs = relationship("MaintenanceLog", back_populates="extinguisher")

class IoTReading(Base):
    __tablename__ = "iot_readings"
    id = Column(Integer, primary_key=True, index=True)
    extinguisher_id = Column(Integer, ForeignKey("fire_extinguishers.id"))
    pressure = Column(Float)
    battery = Column(Float, nullable=True, default=100.0)
    temperature = Column(Float)
    weight = Column(Float)
    tilt = Column(Boolean)
    availability = Column(Boolean)
    device_health = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    extinguisher = relationship("FireExtinguisher", back_populates="readings")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    extinguisher_id = Column(Integer, ForeignKey("fire_extinguishers.id"))
    type = Column(String) # Pressure Low, Missing, Device Offline, Expiry, Tilt
    message = Column(String)
    is_resolved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    extinguisher = relationship("FireExtinguisher", back_populates="alerts")

class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"
    id = Column(Integer, primary_key=True, index=True)
    extinguisher_id = Column(Integer, ForeignKey("fire_extinguishers.id"))
    technician_id = Column(Integer, ForeignKey("users.id"))
    task_description = Column(String)
    status = Column(String) # Pending, Completed
    notes = Column(Text, nullable=True)
    scheduled_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    fault_description = Column(Text, nullable=True)
    root_cause = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    fix_notes = Column(Text, nullable=True)
    fix_plan = Column(Text, nullable=True)  # JSON string of structured fix plan
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    extinguisher = relationship("FireExtinguisher", back_populates="maintenance_logs")
    technician = relationship("User")
