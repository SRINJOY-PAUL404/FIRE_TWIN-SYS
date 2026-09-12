import time
import json
import random
import os
import paho.mqtt.client as mqtt

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

def main():
    client = mqtt.Client()
    print(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    
    # Simulate a few devices for the demo
    devices = [f"ESP32-{10000+i}" for i in range(1, 11)]
    
    try:
        while True:
            for device in devices:
                # generate random data
                payload = {
                    "pressure": round(random.uniform(30.0, 100.0), 2),
                    "temperature": round(random.uniform(20.0, 35.0), 2),
                    "battery": round(random.uniform(10.0, 100.0), 2),
                    "tilt": random.choice([True, False, False, False, False]), # 20% chance of tilt
                    "status": "Healthy"
                }
                
                # Simulate rare rapid pressure drop (emergency)
                if random.random() < 0.05: # 5% chance per device per tick
                    payload["pressure"] = round(random.uniform(10.0, 25.0), 2)
                    
                if payload["pressure"] < 30.0:
                    payload["status"] = "Emergency"
                elif payload["pressure"] < 40.0:
                    payload["status"] = "Low Pressure"
                
                topic = f"firetwin/extinguishers/{device}"
                client.publish(topic, json.dumps(payload))
                print(f"Published to {topic}: {payload}")
                
            time.sleep(5)
    except KeyboardInterrupt:
        print("Simulator stopped.")

if __name__ == "__main__":
    main()
