import requests
from flask import Blueprint, request, Response, g
from auth import require_auth
import config
import models

proxy_bp = Blueprint("proxy", __name__, url_prefix="/api/orthanc")

TIMEOUT_DEFAULT = 15        # metadata, tags, previews, buscas
TIMEOUT_TRANSFER = 120      # download de arquivos DICOM pesados
STREAM_CHUNK_SIZE = 64 * 1024  # 64 KB

# Headers que não devem ser repassados
EXCLUDED_HEADERS = {"host", "authorization", "content-length", "transfer-encoding"}


def _get_orthanc_auth():
    """Retorna as credenciais do usuário logado para autenticação no Orthanc.
    Usa o admin global como fallback caso a senha do usuário não esteja armazenada."""
    user_id = g.user.get("user_id")
    if user_id:
        creds = models.get_user_credentials(user_id)
        if creds:
            # Quando o council_number coincide com o usuário global do Orthanc
            # (ex.: "admin"), a senha efetiva no Orthanc é a global, pois o sync
            # preserva ORTHANC_USER/ORTHANC_PASS por último.
            if creds[0] == config.ORTHANC_USER:
                return (config.ORTHANC_USER, config.ORTHANC_PASS)
            return creds
    return (config.ORTHANC_USER, config.ORTHANC_PASS)


def proxy_request(orthanc_path, timeout=TIMEOUT_DEFAULT):
    """Repassa a requisição pro Orthanc e retorna a resposta."""
    url = f"{config.ORTHANC_URL}{orthanc_path}"

    # Query string
    if request.query_string:
        url += f"?{request.query_string.decode('utf-8')}"

    # Headers filtrados
    headers = {
        key: value
        for key, value in request.headers
        if key.lower() not in EXCLUDED_HEADERS
    }

    try:
        resp = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=request.get_data(),
            auth=_get_orthanc_auth(),
            timeout=timeout,
            stream=True,
        )

        # Monta a resposta de volta pro cliente
        # www-authenticate nunca deve chegar ao browser — o proxy autentica
        # com o Orthanc internamente; expô-lo dispara popup nativo de Basic Auth
        excluded_resp_headers = {"content-encoding", "transfer-encoding", "content-length", "www-authenticate"}
        response_headers = {
            key: value
            for key, value in resp.headers.items()
            if key.lower() not in excluded_resp_headers
        }

        # 401 do Orthanc jamais deve chegar ao cliente como 401 —
        # o interceptor Axios trata qualquer 401 como token JWT inválido e desloga.
        # Credencial errada no Orthanc é falha de configuração do servidor (502).
        if resp.status_code == 401:
            return Response(
                '{"error": "Falha de autenticação com o Orthanc. Verifique ORTHANC_USER/ORTHANC_PASS."}',
                status=502,
                content_type="application/json",
            )

        def stream_chunks():
            try:
                for chunk in resp.iter_content(chunk_size=STREAM_CHUNK_SIZE):
                    yield chunk
            finally:
                resp.close()

        return Response(
            stream_chunks(),
            status=resp.status_code,
            headers=response_headers,
        )

    except requests.ConnectionError:
        return Response('{"error": "Orthanc indisponível"}', status=502, content_type="application/json")
    except requests.Timeout:
        return Response('{"error": "Timeout na conexão com Orthanc"}', status=504, content_type="application/json")
    except requests.RequestException:
        return Response('{"error": "Erro de comunicação com Orthanc"}', status=502, content_type="application/json")


# ── Rotas de leitura ───────────────────────────────────

@proxy_bp.route("/system", methods=["GET"])
@require_auth
def system():
    return proxy_request("/system")


@proxy_bp.route("/statistics", methods=["GET"])
@require_auth
def statistics():
    return proxy_request("/statistics")


@proxy_bp.route("/patients", methods=["GET"])
@require_auth
def list_patients():
    return proxy_request("/patients")


@proxy_bp.route("/patients/<patient_id>", methods=["GET"])
@require_auth
def get_patient(patient_id):
    return proxy_request(f"/patients/{patient_id}")


@proxy_bp.route("/studies", methods=["GET"])
@require_auth
def list_studies():
    return proxy_request("/studies")


@proxy_bp.route("/studies/<study_id>", methods=["GET"])
@require_auth
def get_study(study_id):
    return proxy_request(f"/studies/{study_id}")


@proxy_bp.route("/series", methods=["GET"])
@require_auth
def list_series():
    return proxy_request("/series")


@proxy_bp.route("/series/<series_id>", methods=["GET"])
@require_auth
def get_series(series_id):
    return proxy_request(f"/series/{series_id}")


@proxy_bp.route("/series/<series_id>/instances", methods=["GET"])
@require_auth
def get_series_instances(series_id):
    return proxy_request(f"/series/{series_id}/instances")


@proxy_bp.route("/instances/<instance_id>", methods=["GET"])
@require_auth
def get_instance(instance_id):
    return proxy_request(f"/instances/{instance_id}")


@proxy_bp.route("/instances/<instance_id>/preview", methods=["GET"])
@require_auth
def get_instance_preview(instance_id):
    return proxy_request(f"/instances/{instance_id}/preview")


@proxy_bp.route("/instances/<instance_id>/file", methods=["GET"])
@require_auth
def get_instance_file(instance_id):
    return proxy_request(f"/instances/{instance_id}/file", timeout=TIMEOUT_TRANSFER)


@proxy_bp.route("/instances/<instance_id>/frames/<int:frame>/preview", methods=["GET"])
@require_auth
def get_frame_preview(instance_id, frame):
    return proxy_request(f"/instances/{instance_id}/frames/{frame}/preview")


# ── Busca ──────────────────────────────────────────────

@proxy_bp.route("/tools/find", methods=["POST"])
@require_auth
def find():
    return proxy_request("/tools/find")


@proxy_bp.route("/tools/lookup", methods=["POST"])
@require_auth
def lookup():
    return proxy_request("/tools/lookup")


# ── Tags DICOM ─────────────────────────────────────────

@proxy_bp.route("/instances/<instance_id>/simplified-tags", methods=["GET"])
@require_auth
def get_simplified_tags(instance_id):
    return proxy_request(f"/instances/{instance_id}/simplified-tags")


@proxy_bp.route("/instances/<instance_id>/tags", methods=["GET"])
@require_auth
def get_tags(instance_id):
    return proxy_request(f"/instances/{instance_id}/tags")


@proxy_bp.route("/studies/<study_id>/series", methods=["GET"])
@require_auth
def get_study_series(study_id):
    return proxy_request(f"/studies/{study_id}/series")


@proxy_bp.route("/patients/<patient_id>/studies", methods=["GET"])
@require_auth
def get_patient_studies(patient_id):
    return proxy_request(f"/patients/{patient_id}/studies")
