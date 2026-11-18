import sqlite3
import os

db_path = os.path.join("services", "document-service", "data", "documents.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    existing_cols = [c[1] for c in cur.execute("PRAGMA table_info(documents)").fetchall()]
    print("Initial columns in documents.db:", existing_cols)

    expected_cols = {
        "file_hash": "VARCHAR(64)",
        "author_name": "VARCHAR(100)",
        "is_shared": "INTEGER DEFAULT 0",
        "sharing_scope": "VARCHAR(50) DEFAULT 'private'"
    }

    for col, definition in expected_cols.items():
        if col not in existing_cols:
            print(f"Adding column '{col}'...")
            cur.execute(f"ALTER TABLE documents ADD COLUMN {col} {definition}")
            conn.commit()
            print(f"Added '{col}' successfully!")

    final_cols = [c[1] for c in cur.execute("PRAGMA table_info(documents)").fetchall()]
    print("Final columns in documents.db:", final_cols)
    conn.close()
else:
    print(f"Database {db_path} not found.")
