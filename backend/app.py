from flask import Flask
from flask_cors import CORS
import config
import models
from auth import auth_bp
from proxy import proxy_bp


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Registra blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(proxy_bp)

    # Inicializa o banco
    models.init_db()

    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "ok"}

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
    app.run(host=config.HOST, port=config.PORT, debug=False)
