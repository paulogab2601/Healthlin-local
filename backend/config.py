import os

# Orthanc
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USER = os.getenv("ORTHANC_USER", "admin")
ORTHANC_PASS = os.getenv("ORTHANC_PASS", "sua_senha")
ORTHANC_CREDENTIALS_PATH = os.getenv("ORTHANC_CREDENTIALS_PATH", "/etc/orthanc/credentials.json")

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "332291180@*p")
JWT_EXPIRATION_HOURS = 12

# Em produção, a variável JWT_SECRET deve ser definida explicitamente.
# Falhar no startup é preferível a rodar com segredo padrão conhecido.
if os.getenv("FLASK_ENV") == "production" and not os.getenv("JWT_SECRET"):
    raise RuntimeError(
        "JWT_SECRET não definido. "
        "Defina a variável de ambiente JWT_SECRET antes de iniciar em produção."
    )

# Database
DB_PATH = os.getenv("DB_PATH", "/opt/healthlin/backend/healthlin.db")

# Server
HOST = "0.0.0.0"
PORT = 5000
