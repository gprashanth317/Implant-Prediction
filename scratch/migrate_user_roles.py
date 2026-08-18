import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'fallback_local.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

columns_to_add = [
    ("role", "VARCHAR(50) DEFAULT 'doctor'"),
    ("hospital_address", "VARCHAR(255) DEFAULT '104 Medical Enclave, Healthcare City, Chennai'"),
    ("address", "VARCHAR(255) DEFAULT '123 Main Street'"),
    ("age", "INTEGER DEFAULT 45"),
    ("gender", "VARCHAR(20) DEFAULT 'Male'"),
    ("patient_id", "VARCHAR(50) DEFAULT 'PID-2026-001'")
]

# Get existing columns
cur.execute("PRAGMA table_info(user)")
existing_cols = [row[1] for row in cur.fetchall()]

for col_name, col_def in columns_to_add:
    if col_name not in existing_cols:
        print(f"Adding column: {col_name}")
        cur.execute(f"ALTER TABLE user ADD COLUMN {col_name} {col_def}")
    else:
        print(f"Column {col_name} already exists.")

conn.commit()

# Create a sample patient user for easy testing
cur.execute("SELECT id FROM user WHERE email = 'patient@clinicalportal.com' OR username = 'patient'")
res = cur.fetchone()
if not res:
    cur.execute("""
        INSERT INTO user (email, username, name, joined_date, password, is_registered, role, phone, specialty, clinic_name, hospital_address, address, age, gender, patient_id)
        VALUES ('patient@clinicalportal.com', 'patient', 'John Doe (Patient)', '2026-08-18', 'password', 1, 'patient', '+91 98123 45678', 'General Patient', 'City Dental Hospital', '104 Medical Enclave, Healthcare City, Chennai', 'Flat 4B, Green Park Residences, Bangalore', 48, 'Male', 'PID-2026-889')
    """)
    conn.commit()
    print("Created sample patient account: username 'patient', password 'password'")

conn.close()
print("Database migration complete!")
