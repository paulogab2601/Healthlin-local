import sqlite3
import bcrypt
from datetime import datetime
import config


def get_db():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            council_type TEXT NOT NULL CHECK(council_type IN ('CRM', 'CRTR', 'MATRICULA')),
            council_number TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'medico' CHECK(role IN ('admin', 'medico', 'tecnico')),
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(council_type, council_number)
        )
    """)
    conn.commit()
    conn.close()


def create_user(name, council_type, council_number, password, role="medico"):
    conn = get_db()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        conn.execute(
            "INSERT INTO users (name, council_type, council_number, password_hash, role) VALUES (?, ?, ?, ?, ?)",
            (name, council_type.upper(), council_number, password_hash, role),
        )
        conn.commit()
        return True, "Usuário criado com sucesso"
    except sqlite3.IntegrityError:
        return False, "Usuário já existe com esse conselho/matrícula"
    finally:
        conn.close()


def authenticate(council_type, council_number, password):
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE council_type = ? AND council_number = ? AND active = 1",
        (council_type.upper(), council_number),
    ).fetchone()
    conn.close()

    if user and bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return dict(user)
    return None


def get_user_by_id(user_id):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ? AND active = 1", (user_id,)).fetchone()
    conn.close()
    return dict(user) if user else None


def list_users():
    conn = get_db()
    users = conn.execute("SELECT id, name, council_type, council_number, role, active, created_at FROM users").fetchall()
    conn.close()
    return [dict(u) for u in users]


def deactivate_user(user_id):
    conn = get_db()
    conn.execute("UPDATE users SET active = 0 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
