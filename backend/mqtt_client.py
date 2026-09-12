import os
import json
import asyncio
import paho.mqtt.client as mqtt
from ws_manager import manager
from database import SessionLocal
import models
from datetime import datetime
import notifications

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

# MQTT callbaks
def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")
    client.subscribe("firetwin/extinguishers/+")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        topic_parts = msg.topic.split('/')
        if len(topic_parts) >= 3:
            device_id = topic_parts[2]
            # Handle reading asynchronously
            asyncio.run(process_reading(device_id, payload))
    except Exception as e:
        print(f"Error processing MQTT message: {e}")

async def process_reading(device_id: str, payload: dict):
    db = SessionLocal()
    try:
        extinguisher = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.esp32_device_id == device_id).first()
        if not extinguisher:
            return

        # Update extinguisher status
        extinguisher.pressure = payload.get("pressure", extinguisher.pressure)
        extinguisher.battery = payload.get("battery", extinguisher.battery)
        extinguisher.status = payload.get("status", extinguisher.status)
        
        # Get maintenance settings
        settings = db.query(models.Setting).filter(models.Setting.category == "maintenance").all()
        maintenance_settings = {s.key: s.value for s in settings}
        try:
            low_pressure_threshold = float(maintenance_settings.get("low_pressure_threshold", 40.0))
        except ValueError:
            low_pressure_threshold = 40.0
            
        is_emergency = False
        if extinguisher.pressure < low_pressure_threshold - 10.0:
            extinguisher.status = "Emergency"
            alert = models.Alert(extinguisher_id=extinguisher.id, type="Rapid Pressure Drop", message=f"EMERGENCY: Pressure dropped critically to {extinguisher.pressure}%")
            db.add(alert)
            is_emergency = True
            
            # Trigger mock notifications
            loc = db.query(models.Location).filter(models.Location.id == extinguisher.location_id).first()
            if loc:
                bldg = db.query(models.Building).filter(models.Building.id == loc.building_id).first()
                b_name = bldg.name if bldg else "Unknown Building"
                location_str = f"Building: {b_name}, Location: {loc.name}"
            else:
                location_str = "Unknown Location"
            notifications.trigger_emergency_notifications(extinguisher.extinguisher_id, location_str, "Rapid Pressure Drop (Possible Fire!)")
            
        elif extinguisher.pressure < low_pressure_threshold:
            extinguisher.status = "Low Pressure"
            alert = models.Alert(extinguisher_id=extinguisher.id, type="Low Pressure", message=f"Pressure dropped to {extinguisher.pressure}%")
            db.add(alert)
            
        if payload.get("tilt", False):
            alert = models.Alert(extinguisher_id=extinguisher.id, type="Tilt Detected", message="Extinguisher tilted or moved")
            db.add(alert)

        # Create IoT Reading history
        reading = models.IoTReading(
            extinguisher_id=extinguisher.id,
            pressure=extinguisher.pressure,
            temperature=payload.get("temperature", 25.0),
            tilt=payload.get("tilt", False),
            availability=True,
            device_health="Good"
        )
        db.add(reading)
        db.commit()
        
        # Broadcast to WebSocket
        loc = db.query(models.Location).filter(models.Location.id == extinguisher.location_id).first() if extinguisher.location_id else None
        bldg = db.query(models.Building).filter(models.Building.id == loc.building_id).first() if loc and loc.building_id else None

        update_msg = {
            "type": "EMERGENCY" if is_emergency else "UPDATE",
            "reading_id": reading.id,
            "extinguisher_id": extinguisher.id,
            "device_id": device_id,
            "extinguisher_code": extinguisher.extinguisher_id,
            "building_name": bldg.name if bldg else "Campus Central",
            "location_name": loc.name if loc else "Storage / Reserve",
            "room": extinguisher.room or "",
            "pressure": extinguisher.pressure,
            "battery": extinguisher.battery,
            "temperature": payload.get("temperature", 25.0),
            "status": extinguisher.status,
            "timestamp": datetime.utcnow().isoformat()
        }
        await manager.broadcast(update_msg)
        
    finally:
        db.close()

def start_mqtt_client():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
    except Exception as e:
        print(f"Failed to connect to MQTT broker ({MQTT_BROKER}:{MQTT_PORT}): {e}. Running without MQTT.")
