from database import SessionLocal
import models

db = SessionLocal()

print("=== Extinguisher Statuses ===")
exts = db.query(models.FireExtinguisher).all()
for e in exts:
    print(f"  ID={e.id}, ext_id={e.extinguisher_id}, status={e.status}, pressure={e.pressure}")

print(f"\nTotal extinguishers: {len(exts)}")
non_healthy = [e for e in exts if e.status != "Healthy"]
print(f"Non-healthy: {len(non_healthy)}")
for e in non_healthy:
    print(f"  ID={e.id}, ext_id={e.extinguisher_id}, status={e.status}")

print("\n=== Maintenance Logs ===")
logs = db.query(models.MaintenanceLog).all()
print(f"Total logs: {len(logs)}")
for l in logs:
    print(f"  Log ID={l.id}, ext_id={l.extinguisher_id}, status={l.status}, task={l.task_description}")

db.close()
