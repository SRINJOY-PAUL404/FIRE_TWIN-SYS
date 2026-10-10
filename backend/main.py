from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from contextlib import asynccontextmanager
from ws_manager import manager
from mqtt_client import start_mqtt_client, process_reading
from routers import auth, extinguishers, buildings, ai, settings, api_keys, users, maintenance, admins
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
import asyncio
import random

def init_db_schema():
    from database import engine, Base
    from sqlalchemy import text, inspect
    import models # Ensure models are loaded
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    with engine.connect() as conn:
        try:
            inspector = inspect(engine)
            # Sync users table columns
            if inspector.has_table("users"):
                user_cols = {col["name"] for col in inspector.get_columns("users")}
                if "status" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'active';"))
                if "created_at" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP;"))
                if "last_login_at" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;"))
            # Sync iot_readings table columns
            if inspector.has_table("iot_readings"):
                iot_cols = {col["name"] for col in inspector.get_columns("iot_readings")}
                if "battery" not in iot_cols:
                    conn.execute(text("ALTER TABLE iot_readings ADD COLUMN battery FLOAT DEFAULT 100.0;"))
            conn.commit()
        except Exception as e:
            print(f"[DB Init] Schema sync notice: {e}")

async def simulate_iot_events():
    print("[Simulator] Starting IoT Telemetry simulation loop...")
    from database import SessionLocal
    import models
    while True:
        try:
            await asyncio.sleep(2.5)
            db = SessionLocal()
            try:
                active_exts = db.query(models.FireExtinguisher).filter(models.FireExtinguisher.lifecycle_state == "ACTIVE").all()
                if not active_exts:
                    continue
                
                # Check current abnormal unit count
                abnormal_count = sum(1 for e in active_exts if e.status in ["Emergency", "Low Pressure", "Maintenance Due"])
                max_abnormal_allowed = max(8, int(len(active_exts) * 0.12))  # Keep campus ~88-92% healthy
                
                # Pick 2-3 random active devices for real-time telemetry streaming
                sample_exts = random.sample(active_exts, min(3, len(active_exts)))
                for ext in sample_exts:
                    if not ext.esp32_device_id:
                        continue
                    
                    # Generate telemetry respecting the device's designated state
                    if ext.status == "Emergency":
                        p = round(random.uniform(15.0, 25.0), 1)
                        stat = "Emergency"
                    elif ext.status == "Low Pressure":
                        p = round(random.uniform(30.0, 38.5), 1)
                        stat = "Low Pressure"
                    elif ext.status == "Maintenance Due":
                        p = round(random.uniform(55.0, 75.0), 1)
                        stat = "Maintenance Due"
                    else:
                        # Healthy device: small realistic jitter
                        p = round(random.uniform(92.0, 100.0), 1)
                        stat = "Healthy"
                        
                        # Very rare transient anomaly only if abnormal quota is not exceeded
                        if abnormal_count < max_abnormal_allowed and random.random() < 0.003:
                            p = round(random.uniform(28.0, 36.0), 1)
                            stat = "Low Pressure"
                            abnormal_count += 1
                    
                    payload = {
                        "pressure": p,
                        "battery": ext.battery if ext.battery is not None else 95.0,
                        "temperature": round(random.uniform(22.0, 27.5), 1),
                        "tilt": False,
                        "status": stat
                    }
                    
                    try:
                        await process_reading(ext.esp32_device_id, payload)
                    except Exception as e:
                        print(f"[Simulator] Reading error: {e}")
            finally:
                db.close()
        except asyncio.CancelledError:
            print("[Simulator] Simulator task cancelled.")
            break
        except Exception as e:
            print(f"[Simulator] Loop exception: {e}")
            await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            print("[Simulator] Simulator task cancelled.")
            break
        except Exception as e:
            print(f"[Simulator] Loop exception: {e}")
            await asyncio.sleep(1.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db_schema()
    # Auto-seed if database is empty (first deploy / data reset)
    try:
        from database import SessionLocal
        import models
        db = SessionLocal()
        user_count = db.query(models.User).count()
        db.close()
        if user_count == 0:
            print("[Startup] Empty database detected — running seed...")
            from seed import seed_data
            seed_data()
            print("[Startup] Seed complete.")
    except Exception as e:
        print(f"[Startup] Auto-seed skipped: {e}")
    task = asyncio.create_task(simulate_iot_events())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(
    title="FireTwin AI API",
    description="Digital Twin-Based Fire Extinguisher Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration — allow all origins for tunnel/dev access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root mounted routers
app.include_router(auth.router)
app.include_router(admins.router)
app.include_router(extinguishers.router)
app.include_router(buildings.router)
app.include_router(ai.router)
app.include_router(settings.router)
app.include_router(api_keys.router)
app.include_router(users.router)
app.include_router(maintenance.router)

# /api prefixed routers for standardized frontend calls
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(admins.router)
api_router.include_router(extinguishers.router)
api_router.include_router(buildings.router)
api_router.include_router(ai.router)
api_router.include_router(settings.router)
api_router.include_router(api_keys.router)
api_router.include_router(users.router)
app.include_router(api_router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                break
            except Exception:
                break
    finally:
        manager.disconnect(websocket)

@app.get("/")
def read_root():
    return {"message": "Welcome to FireTwin AI API"}
