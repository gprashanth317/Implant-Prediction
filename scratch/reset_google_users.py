import sqlite3
import os

db_path = 'instance/fallback_local.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE user 
        SET is_registered = 0, password = '' 
        WHERE password IN ('google_authenticated_user', 'google_temp_password') 
           OR password IS NULL 
           OR password = ''
    """)
    conn.commit()
    print(f"Updated {cursor.rowcount} user records to require password setup.")
    conn.close()
else:
    print("Database file does not exist yet.")
