import sqlite3
import bcrypt
import hashlib
import base64
from datetime import datetime
from cryptography.fernet import Fernet
import config


def _get_cipher():
    """Deriva uma chave Fernet determinística a partir do JWT_SECRET."""
    key_bytes = hashlib.sha256(config.JWT_SECRET.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))


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
            password_encrypted TEXT,
            role TEXT NOT NULL DEFAULT 'medico' CHECK(role IN ('admin', 'medico', 'tecnico')),
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(council_type, council_number)
        )
    """)
    # Migração: adiciona coluna em bancos existentes
    try:
        conn.execute("ALTER TABLE users ADD COLUMN password_encrypted TEXT")
    except Exception:
        pass  # Coluna já existe
    conn.commit()
    conn.close()


def create_user(name, council_type, council_number, password, role="medico"):
    conn = get_db()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    password_encrypted = _get_cipher().encrypt(password.encode("utf-8")).decode("utf-8")

    try:
        conn.execute(
            "INSERT INTO users (name, council_type, council_number, password_hash, password_encrypted, role) VALUES (?, ?, ?, ?, ?, ?)",
            (name, council_type.upper(), council_number, password_hash, password_encrypted, role),
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


def deactivate_user(user_id, requester_id):
    # Regra 1: o 1º admin (id=1) é permanente — ninguém pode desativá-lo
    if user_id == 1:
        return False, "O administrador principal não pode ser desativado"

    # Regra 2: auto-desativação bloqueada
    if user_id == requester_id:
        return False, "Você não pode desativar sua própria conta"

    conn = get_db()
    target = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()

    if not target:
        conn.close()
        return False, "Usuário não encontrado"

    # Regra 3: impede lockout — não desativa o último admin ativo além do id=1
    if target["role"] == "admin":
        active_admins = conn.execute(
            "SELECT COUNT(*) FROM users WHERE role = 'admin' AND active = 1 AND id != 1"
        ).fetchone()[0]
        if active_admins <= 1:
            conn.close()
            return False, "Não é possível desativar o último administrador ativo"

    conn.execute("UPDATE users SET active = 0 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True, "Usuário desativado"


def reactivate_user(user_id):
    conn = get_db()
    conn.execute("UPDATE users SET active = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()


def get_user_credentials(user_id):
    """Retorna (council_number, senha_plain) para autenticação no Orthanc, ou None."""
    conn = get_db()
    user = conn.execute(
        "SELECT council_number, password_encrypted FROM users WHERE id = ? AND active = 1",
        (user_id,),
    ).fetchone()
    conn.close()

    if not user or not user["password_encrypted"]:
        return None
    try:
        password = _get_cipher().decrypt(user["password_encrypted"].encode()).decode()
        return (user["council_number"], password)
    except Exception:
        return None


def list_users_with_credentials():
    """Retorna todos os usuários ativos com senha descriptografada (para sync no Orthanc)."""
    conn = get_db()
    users = conn.execute(
        "SELECT council_number, password_encrypted FROM users WHERE active = 1"
    ).fetchall()
    conn.close()

    cipher = _get_cipher()
    result = []
    for u in users:
        if u["password_encrypted"]:
            try:
                password = cipher.decrypt(u["password_encrypted"].encode()).decode()
                result.append({"council_number": u["council_number"], "password": password})
            except Exception:
                pass
    return result


def change_password(user_id, current_password, new_password):
    conn = get_db()
    user = conn.execute(
        "SELECT password_hash FROM users WHERE id = ? AND active = 1", (user_id,)
    ).fetchone()

    if not user:
        conn.close()
        return False, "Usuário não encontrado"

    if not bcrypt.checkpw(current_password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        conn.close()
        return False, "Senha atual incorreta"

    if len(new_password) < 8:
        conn.close()
        return False, "A nova senha deve ter pelo menos 8 caracteres"

    new_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_encrypted = _get_cipher().encrypt(new_password.encode("utf-8")).decode("utf-8")
    conn.execute(
        "UPDATE users SET password_hash = ?, password_encrypted = ? WHERE id = ?",
        (new_hash, new_encrypted, user_id),
    )
    conn.commit()
    conn.close()
    return True, "Senha alterada com sucesso"
