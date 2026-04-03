import os
import logging
import threading
from flask import Flask, send_from_directory
from flask_cors import CORS
import config
import models
import orthanc_sync
from events import user_changed
from auth import auth_bp
from proxy import proxy_bp

logger = logging.getLogger(__name__)

_DEFAULT_DIST = os.path.join(os.path.dirname(__file__), "..", "viewer", "dist")
FRONTEND_DIST = os.getenv("FRONTEND_DIST", os.path.abspath(_DEFAULT_DIST))


def create_app():
    # static_folder=None evita que o Flask registre uma rota /<path:filename>
    # que conflita com o catch-all do SPA e retorna 404 para rotas como /dashboard
    app = Flask(__name__, static_folder=None)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Registra blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(proxy_bp)

    # Conecta subscribers ao signal de mudança de usuário
    user_changed.connect(lambda sender, **kw: orthanc_sync.request_sync())

    # Valida que o diretório do banco existe antes de tentar criar/abrir
    db_dir = os.path.dirname(os.path.abspath(config.DB_PATH))
    if not os.path.isdir(db_dir):
        raise RuntimeError(
            f"Diretório do banco não existe: {db_dir}\n"
            f"Crie o diretório ou defina DB_PATH com um caminho válido."
        )

    # Inicializa o banco
    models.init_db()

    # Admin inicial — rápido (check + insert SQLite), necessário antes de servir
    create_initial_admin()

    # Orthanc sync — pode ser lento (file I/O + systemctl restart com timeout 30s),
    # roda em background para não bloquear o boot do servidor
    def _background_sync():
        try:
            orthanc_sync.sync_orthanc_users()
        except Exception:
            logger.exception("Falha no sync inicial do Orthanc (background)")

    threading.Thread(target=_background_sync, daemon=True, name="orthanc-init-sync").start()

    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "ok"}

    # SPA fallback — serve arquivos estáticos e index.html para qualquer rota não-API
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
            return send_from_directory(FRONTEND_DIST, path)
        index = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index):
            return send_from_directory(FRONTEND_DIST, "index.html")
        return {"error": "Frontend não encontrado. Execute npm run build."}, 404

    return app


# ── Criar admin inicial ───────────────────────────────

def create_initial_admin():
    """Cria o admin padrão se não existir nenhum usuário."""
    import sqlite3

    conn = models.get_db()
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()

    if count == 0:
        success, msg = models.create_user(
            name="Administrador",
            council_type="MATRICULA",
            council_number="admin",
            password="admin123",
            role="admin",
        )
        if success:
            print("\n" + "=" * 50)
            print("  ADMIN INICIAL CRIADO")
            print("  Conselho: MATRICULA")
            print("  Número:   admin")
            print("  Senha:    admin123")
            print("  >>> TROQUE A SENHA APÓS O PRIMEIRO LOGIN <<<")
            print("=" * 50 + "\n")


if __name__ == "__main__":
    app = create_app()
    app.run(host=config.HOST, port=config.PORT, debug=False)

