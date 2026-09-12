from database import SessionLocal
import models
from auth import get_password_hash

db = SessionLocal()
user = db.query(models.User).filter(models.User.email == "admin@firetwin.edu").first()
if user:
    user.hashed_password = get_password_hash("joy9123")
    db.commit()
    print("Password updated successfully.")
else:
    print("User not found.")
db.close()
