import os
from flask import Flask, send_from_directory
from flask_cors import CORS
import config
import models
import orthanc_sync
from auth import auth_bp
from proxy import proxy_bp

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

    # Inicializa o banco
    models.init_db()

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
    create_initial_admin()
    orthanc_sync.sync_orthanc_users()
    app.run(host=config.HOST, port=config.PORT, debug=False)

