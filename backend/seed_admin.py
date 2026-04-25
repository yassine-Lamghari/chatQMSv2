import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, User, init_db
import bcrypt

init_db()
db = SessionLocal()

admin = db.query(User).filter(User.username == "admin").first()
if not admin:
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw("admin".encode('utf-8'), salt).decode('utf-8')
    new_admin = User(username="admin", password_hash=hashed_pw, role="admin")
    db.add(new_admin)
    db.commit()
    print("Admin user created successfully")
else:
    print("Admin user already exists")

db.close()
