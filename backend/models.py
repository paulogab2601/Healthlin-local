import sqlite3
import bcrypt
import hashlib
import base64
import time
from datetime import datetime
from cryptography.fernet import Fernet
import config

# ── Cipher singleton (JWT_SECRET não muda em runtime) ──
_cipher_instance = None


def _get_cipher():
    """Retorna (ou cria) instância Fernet derivada do JWT_SECRET."""
    global _cipher_instance
    if _cipher_instance is None:
        key_bytes = hashlib.sha256(config.JWT_SECRET.encode()).digest()
        _cipher_instance = Fernet(base64.urlsafe_b64encode(key_bytes))
    return _cipher_instance


# ── Cache de credenciais com TTL ──
_creds_cache: dict[int, tuple[float, tuple[str, str] | None]] = {}
_CREDS_TTL = 60  # segundos


def invalidate_credentials_cache(user_id: int | None = None):
    """Remove entradas do cache de credenciais. Sem argumento limpa tudo."""
    if user_id is None:
        _creds_cache.clear()
    else:
        _creds_cache.pop(user_id, None)


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
            role TEXT NOT NULL DEFAULT 'medico' CHECK(role IN ('admin', 'medico', 'tecnico', 'secretaria')),
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

    # Migração: adiciona 'secretaria' ao CHECK constraint de role.
    # SQLite não permite ALTER CHECK, então recria a tabela se necessário.
    table_sql = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
    ).fetchone()[0]
    if "'secretaria'" not in table_sql:
        conn.executescript("""
            ALTER TABLE users RENAME TO users_old;
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                council_type TEXT NOT NULL CHECK(council_type IN ('CRM', 'CRTR', 'MATRICULA')),
                council_number TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                password_encrypted TEXT,
                role TEXT NOT NULL DEFAULT 'medico' CHECK(role IN ('admin', 'medico', 'tecnico', 'secretaria')),
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(council_type, council_number)
            );
            INSERT INTO users SELECT * FROM users_old;
            DROP TABLE users_old;
        """)

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


def list_users(page=1, per_page=20, search=None, role=None, active=None):
    conn = get_db()
    base = "FROM users WHERE 1=1"
    params = []

    if search:
        base += " AND name LIKE ?"
        params.append(f"%{search}%")
    if role:
        base += " AND role = ?"
        params.append(role)
    if active is not None:
        base += " AND active = ?"
        params.append(int(active))

    total = conn.execute(f"SELECT COUNT(*) {base}", params).fetchone()[0]

    offset = (page - 1) * per_page
    query = f"SELECT id, name, council_type, council_number, role, active, created_at {base} ORDER BY name ASC LIMIT ? OFFSET ?"
    users = conn.execute(query, params + [per_page, offset]).fetchall()
    conn.close()

    return {
        "items": [dict(u) for u in users],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


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
    cur = conn.execute("UPDATE users SET active = 1 WHERE id = ? AND active = 0", (user_id,))
    conn.commit()
    rows = cur.rowcount
    conn.close()
    if rows == 0:
        # Distingue entre ID inexistente e usuário já ativo
        conn2 = get_db()
        exists = conn2.execute("SELECT 1 FROM users WHERE id = ?", (user_id,)).fetchone()
        conn2.close()
        if not exists:
            return False, "Usuário não encontrado"
        return False, "Usuário já está ativo"
    return True, "Usuário reativado"


def get_user_credentials(user_id):
    """Retorna (council_number, senha_plain) para autenticação no Orthanc, ou None.
    Resultado cacheado por até _CREDS_TTL segundos para evitar query + decrypt a cada request."""
    now = time.monotonic()
    cached = _creds_cache.get(user_id)
    if cached and cached[0] > now:
        return cached[1]

    conn = get_db()
    user = conn.execute(
        "SELECT council_number, password_encrypted FROM users WHERE id = ? AND active = 1",
        (user_id,),
    ).fetchone()
    conn.close()

    if not user or not user["password_encrypted"]:
        _creds_cache[user_id] = (now + _CREDS_TTL, None)
        return None
    try:
        password = _get_cipher().decrypt(user["password_encrypted"].encode()).decode()
        result = (user["council_number"], password)
        _creds_cache[user_id] = (now + _CREDS_TTL, result)
        return result
    except Exception:
        _creds_cache[user_id] = (now + _CREDS_TTL, None)
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


def update_password_encrypted(user_id: int, password: str) -> bool:
    """Preenche password_encrypted quando está NULL (backfill pós-migração).
    Não sobrescreve se já estiver preenchido.
    Retorna True quando o backfill realmente alterou o registro."""
    encrypted = _get_cipher().encrypt(password.encode()).decode()
    conn = get_db()
    before_changes = conn.total_changes
    conn.execute(
        "UPDATE users SET password_encrypted = ? WHERE id = ? AND password_encrypted IS NULL",
        (encrypted, user_id),
    )
    conn.commit()
    updated = conn.total_changes > before_changes
    conn.close()
    if updated:
        invalidate_credentials_cache(user_id)
    return updated


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
    invalidate_credentials_cache(user_id)
    return True, "Senha alterada com sucesso"
