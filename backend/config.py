import os

# Orthanc
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USER = os.getenv("ORTHANC_USER", "admin")
ORTHANC_PASS = os.getenv("ORTHANC_PASS", "sua_senha")

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "TROQUE_ESTA_CHAVE_EM_PRODUCAO")
JWT_EXPIRATION_HOURS = 12

# Database
DB_PATH = os.getenv("DB_PATH", "/opt/healthlin/backend/healthlin.db")

# Server
HOST = "0.0.0.0"
PORT = 5000
