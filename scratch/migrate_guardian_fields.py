import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'fallback_local.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("PRAGMA table_info(user)")
cols = [r[1] for r in cur.fetchall()]

if 'guardian_name' not in cols:
    cur.execute("ALTER TABLE user ADD COLUMN guardian_name VARCHAR(150) DEFAULT 'Robert Doe (Father)'")
    print("Added guardian_name")

if 'guardian_phone' not in cols:
    cur.execute("ALTER TABLE user ADD COLUMN guardian_phone VARCHAR(50) DEFAULT '+91 98450 11223'")
    print("Added guardian_phone")

conn.commit()

# Update the sample patient
cur.execute("UPDATE user SET guardian_name = 'Robert Doe (Father)', guardian_phone = '+91 98450 11223' WHERE email = 'patient@clinicalportal.com' OR username = 'patient'")
conn.commit()
conn.close()
print("Guardian fields migration completed successfully!")
