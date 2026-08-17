import sqlite3
import os

db_path = 'instance/fallback_local.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE user ADD COLUMN phone VARCHAR(50) DEFAULT '+91 98765 43210'")
        conn.commit()
        print("Successfully added 'phone' column to user table.")
    except Exception as e:
        print(f"Notice: {e}")
    conn.close()
else:
    print("Database file instance/fallback_local.db does not exist yet.")
