import sqlite3
import os

db_path = "d:/Student digital platform/student-digital-management/backend/cec_student.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        print("Adding faculty_count column...")
        cursor.execute("ALTER TABLE departments ADD COLUMN faculty_count INTEGER DEFAULT 0")
        print("Adding student_count column...")
        cursor.execute("ALTER TABLE departments ADD COLUMN student_count INTEGER DEFAULT 0")
        conn.commit()
        print("Migration successful!")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()
