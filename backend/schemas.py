from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: str = "admin"
    status: str = "active"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AdminBase(BaseModel):
    name: str
    email: str
    role: str = "admin" # super_admin | admin
    status: str = "active" # active | disabled

class AdminCreate(AdminBase):
    password: str

class AdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class AdminResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    status: str
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "technician"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[AdminResponse] = None

class TokenData(BaseModel):
    email: Optional[str] = None
    id: Optional[int] = None
    role: Optional[str] = None


class SettingBase(BaseModel):
    category: str
    key: str
    value: str

class SettingCreate(SettingBase):
    pass

class Setting(SettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class PreferencesUpdate(BaseModel):
    theme: str
    default_view: str
    pressure_units: str

class ApiKeyBase(BaseModel):
    name: str

class ApiKeyCreate(ApiKeyBase):
    pass

class ApiKey(ApiKeyBase):
    id: int
    masked_key: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ApiKeyResponse(ApiKey):
    full_key: Optional[str] = None


class LocationBase(BaseModel):
    building_id: Optional[int] = None
    name: str
    location_type: str = "FLOOR"
    capacity: Optional[int] = 5
    block: Optional[str] = None
    floor: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class Location(LocationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class BuildingBase(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    blocks: List[str] = []
    width: Optional[float] = 10.0
    depth: Optional[float] = 10.0
    floors: Optional[int] = 1
    floor_height: Optional[float] = 3.0

class BuildingCreate(BuildingBase):
    pass

class Building(BuildingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class FireExtinguisherBase(BaseModel):
    extinguisher_id: str
    serial_number: str
    location_id: Optional[int] = None
    room: Optional[str] = None
    type: str
    capacity: str
    pressure: float = 100.0
    rfid_tag: Optional[str] = None
    esp32_device_id: str
    installation_date: datetime
    expiry_date: datetime
    last_inspection_date: Optional[datetime] = None
    next_inspection_date: Optional[datetime] = None
    status: str = "Healthy"
    lifecycle_state: str = "ACTIVE"
    battery: float = 100.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    local_x: Optional[float] = None
    local_z: Optional[float] = None

class FireExtinguisherCreate(FireExtinguisherBase):
    pass

class FireExtinguisherUpdate(BaseModel):
    location_id: Optional[int] = None
    status: Optional[str] = None
    lifecycle_state: Optional[str] = None
    pressure: Optional[float] = None
    battery: Optional[float] = None
    room: Optional[str] = None

class FireExtinguisher(FireExtinguisherBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class IoTReadingBase(BaseModel):
    extinguisher_id: int
    pressure: float
    temperature: float
    battery: float
    tilt: bool
    availability: bool
    device_health: str

class IoTReadingCreate(IoTReadingBase):
    pass

class IoTReading(IoTReadingBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class AlertBase(BaseModel):
    extinguisher_id: int
    type: str
    message: str
    is_resolved: bool = False

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class MaintenanceLogBase(BaseModel):
    extinguisher_id: int
    technician_id: int
    task_description: str
    status: str
    notes: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    fault_description: Optional[str] = None
    root_cause: Optional[str] = None
    confidence: Optional[float] = None
    fix_notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class MaintenanceLogCreate(MaintenanceLogBase):
    pass

class MaintenanceLog(MaintenanceLogBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

    @property
    def time_to_fix(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

# Pydantic v2 needs computed fields explicitly defined in the schema to serialize them, or we can use @computed_field. Let's use @computed_field for correct serialization.

from pydantic import computed_field

class MaintenanceLogResponse(MaintenanceLog):
    technician_name: Optional[str] = None

    @computed_field
    def time_to_fix(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

class MaintenanceCompleteRequest(BaseModel):
    fix_notes: str
    is_fixable: bool = True

class AIInspectionResponse(BaseModel):
    extinguisher_id: int
    fault_description: str
    root_cause: str
    confidence: float
    maintenance_log_id: int
