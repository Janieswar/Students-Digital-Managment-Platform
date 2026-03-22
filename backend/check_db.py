import sqlite3
import os

db_path = "d:/Student digital platform/student-digital-management/backend/cec_student.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(departments)")
    columns = cursor.fetchall()
    print("Columns in 'departments' table:")
    for col in columns:
        print(col)
    conn.close()
