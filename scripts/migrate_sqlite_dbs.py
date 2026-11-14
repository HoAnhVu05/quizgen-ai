import sqlite3
import os
import sys

def migrate_auth_db():
    db_path = os.path.abspath('services/auth-service/data/auth.db')
    if not os.path.exists(db_path):
        print(f"File {db_path} does not exist.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(users)")
    existing = [r[1] for r in cursor.fetchall()]

    new_cols = [
        ('google_id', 'TEXT'),
        ('avatar_url', 'TEXT'),
        ('auth_provider', "TEXT DEFAULT 'local'"),
        ('status', "TEXT DEFAULT 'active'"),
        ('lock_type', 'TEXT'),
        ('lock_reason', 'TEXT'),
        ('locked_until', 'TIMESTAMP'),
        ('locked_at', 'TIMESTAMP'),
        ('plan_tier', "TEXT DEFAULT 'free'")
    ]

    for col_name, col_type in new_cols:
        if col_name not in existing:
            print(f"Adding column {col_name} ({col_type}) to auth.users...")
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")

    conn.commit()
    cursor.execute("PRAGMA table_info(users)")
    print("Updated columns in auth.users:", [r[1] for r in cursor.fetchall()])
    conn.close()

def migrate_exam_db():
    db_path = os.path.abspath('services/exam-service/data/exam.db')
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check questions table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='questions'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(questions)")
        existing = [r[1] for r in cursor.fetchall()]
        new_cols = [
            ('image_url', 'TEXT'),
            ('has_formula', 'BOOLEAN DEFAULT 0'),
            ('image_caption', 'TEXT')
        ]
        for col_name, col_type in new_cols:
            if col_name not in existing:
                print(f"Adding column {col_name} ({col_type}) to exam.questions...")
                try:
                    cursor.execute(f"ALTER TABLE questions ADD COLUMN {col_name} {col_type}")
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    print("Migrating SQLite databases...")
    migrate_auth_db()
    migrate_exam_db()
    print("Done!")
