import jwt
import functools
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
import config
import models

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def create_token(user):
    payload = {
        "user_id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "council_type": user["council_type"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=config.JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm="HS256")


def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")

        if not token:
            return jsonify({"error": "Token não fornecido"}), 401

        try:
            payload = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
            g.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 401

        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    @functools.wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if g.user.get("role") != "admin":
            return jsonify({"error": "Acesso restrito a administradores"}), 403
        return f(*args, **kwargs)
    return decorated


# ── Rotas ──────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Dados não fornecidos"}), 400

    council_type = data.get("council_type", "")
    council_number = data.get("council_number", "")
    password = data.get("password", "")

    if not all([council_type, council_number, password]):
        return jsonify({"error": "Preencha todos os campos"}), 400

    user = models.authenticate(council_type, council_number, password)

    if not user:
        return jsonify({"error": "Credenciais inválidas"}), 401

    token = create_token(user)

    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "role": user["role"],
            "council_type": user["council_type"],
            "council_number": user["council_number"],
        },
    })


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    user = models.get_user_by_id(g.user["user_id"])
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    return jsonify({
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "council_type": user["council_type"],
        "council_number": user["council_number"],
    })


# ── Gestão de usuários (admin) ─────────────────────────

@auth_bp.route("/users", methods=["GET"])
@require_admin
def list_all_users():
    return jsonify(models.list_users())


@auth_bp.route("/users", methods=["POST"])
@require_admin
def create_user():
    data = request.get_json()

    required = ["name", "council_type", "council_number", "password"]
    if not data or not all(data.get(f) for f in required):
        return jsonify({"error": "Campos obrigatórios: name, council_type, council_number, password"}), 400

    role = data.get("role", "medico")
    if role not in ("admin", "medico", "tecnico"):
        return jsonify({"error": "Role inválida. Use: admin, medico, tecnico"}), 400

    success, message = models.create_user(
        name=data["name"],
        council_type=data["council_type"],
        council_number=data["council_number"],
        password=data["password"],
        role=role,
    )

    if success:
        return jsonify({"message": message}), 201
    return jsonify({"error": message}), 409


@auth_bp.route("/users/<int:user_id>", methods=["DELETE"])
@require_admin
def delete_user(user_id):
    models.deactivate_user(user_id)
    return jsonify({"message": "Usuário desativado"})


@auth_bp.route("/change-password", methods=["PUT"])
@require_auth
def change_password():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Dados não fornecidos"}), 400

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return jsonify({"error": "Preencha todos os campos"}), 400

    success, message = models.change_password(
        user_id=g.user["user_id"],
        current_password=current_password,
        new_password=new_password,
    )

    if success:
        return jsonify({"message": message})
    return jsonify({"error": message}), 400
