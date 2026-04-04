import math

import requests
from flask import Blueprint, request, Response, g, jsonify

from auth import require_auth
import config
import models

proxy_bp = Blueprint("proxy", __name__, url_prefix="/api/orthanc")

TIMEOUT_DEFAULT = 15  # metadata, tags, previews, search
TIMEOUT_TRANSFER = 120  # heavy DICOM file download
STREAM_CHUNK_SIZE = 64 * 1024  # 64 KB

# Headers that should not be forwarded to Orthanc
EXCLUDED_HEADERS = {"host", "authorization", "content-length", "transfer-encoding"}


def _global_orthanc_auth():
    return (config.ORTHANC_USER, config.ORTHANC_PASS)



def _get_orthanc_auth():
    """Return credentials for Orthanc auth, preferring logged user credentials."""
    user_id = g.user.get("user_id")
    if user_id:
        creds = models.get_user_credentials(user_id)
        if creds:
            # If app user matches global Orthanc user, keep global password.
            if creds[0] == config.ORTHANC_USER:
                return _global_orthanc_auth()
            return creds
    return _global_orthanc_auth()


def _request_orthanc(url, headers, payload, auth, timeout, stream):
    return requests.request(
        method=request.method,
        url=url,
        headers=headers,
        data=payload,
        auth=auth,
        timeout=timeout,
        stream=stream,
    )


def _retry_with_global_auth_if_unauthorized(resp, url, headers, payload, auth, timeout, stream):
    """If per-user auth fails with 401, retry once with global Orthanc account."""
    if resp.status_code != 401 or auth == _global_orthanc_auth():
        return resp

    resp.close()
    return _request_orthanc(
        url=url,
        headers=headers,
        payload=payload,
        auth=_global_orthanc_auth(),
        timeout=timeout,
        stream=stream,
    )


def proxy_request(orthanc_path, timeout=TIMEOUT_DEFAULT):
    """Forward request to Orthanc and stream response back to client."""
    url = f"{config.ORTHANC_URL}{orthanc_path}"

    if request.query_string:
        url += f"?{request.query_string.decode('utf-8')}"

    headers = {
        key: value
        for key, value in request.headers
        if key.lower() not in EXCLUDED_HEADERS
    }
    payload = request.get_data()
    auth = _get_orthanc_auth()

    try:
        resp = _request_orthanc(
            url=url,
            headers=headers,
            payload=payload,
            auth=auth,
            timeout=timeout,
            stream=True,
        )
        resp = _retry_with_global_auth_if_unauthorized(
            resp=resp,
            url=url,
            headers=headers,
            payload=payload,
            auth=auth,
            timeout=timeout,
            stream=True,
        )

        excluded_resp_headers = {
            "content-encoding",
            "transfer-encoding",
            "content-length",
            "www-authenticate",
        }
        response_headers = {
            key: value
            for key, value in resp.headers.items()
            if key.lower() not in excluded_resp_headers
        }

        # Orthanc 401 should not bubble as 401 to frontend JWT interceptor.
        if resp.status_code == 401:
            resp.close()
            return Response(
                '{"error": "Falha de autenticacao com o Orthanc. Verifique sincronizacao do usuario e credenciais globais."}',
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
        return Response('{"error": "Orthanc indisponivel"}', status=502, content_type="application/json")
    except requests.Timeout:
        return Response('{"error": "Timeout na conexao com Orthanc"}', status=504, content_type="application/json")
    except requests.RequestException:
        return Response('{"error": "Erro de comunicacao com Orthanc"}', status=502, content_type="application/json")



def _to_finite_number(value):
    """Try to coerce a value to finite float, otherwise return None."""
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        number = float(value)
        return number if math.isfinite(number) else None

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None

        try:
            number = float(stripped)
        except ValueError:
            return None
        return number if math.isfinite(number) else None

    return None


def _to_numeric_list(value):
    """Accept list/tuple or DICOM-style multivalue string and return finite numbers."""
    if isinstance(value, (list, tuple)):
        items = value
    elif isinstance(value, str) and "\\" in value:
        items = [part.strip() for part in value.split("\\")]
    else:
        return None

    if len(items) < 2:
        return None

    numbers = []
    for item in items:
        number = _to_finite_number(item)
        if number is None:
            return None
        numbers.append(number)

    return numbers


def _pick_safe_spacing(payload_dict):
    """Return (safe_spacing, source_tag_name) with semantic fallback."""
    pixel_spacing = _to_numeric_list(payload_dict.get("PixelSpacing"))
    if pixel_spacing is not None:
        return pixel_spacing, "PixelSpacing"

    imager_pixel_spacing = _to_numeric_list(payload_dict.get("ImagerPixelSpacing"))
    if imager_pixel_spacing is not None:
        return imager_pixel_spacing, "ImagerPixelSpacing"

    return None, None


def _normalize_simplified_tags_payload(payload):
    """Minimal defensive normalization for simplified-tags."""
    normalized = dict(payload) if isinstance(payload, dict) else {}
    safe_spacing, safe_spacing_source = _pick_safe_spacing(normalized)
    normalized["safeSpacing"] = safe_spacing
    normalized["safeSpacingSource"] = safe_spacing_source
    return normalized


# Read routes
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


# Search
@proxy_bp.route("/tools/find", methods=["POST"])
@require_auth
def find():
    return proxy_request("/tools/find")


@proxy_bp.route("/tools/lookup", methods=["POST"])
@require_auth
def lookup():
    return proxy_request("/tools/lookup")


# DICOM tags
@proxy_bp.route("/instances/<instance_id>/simplified-tags", methods=["GET"])
@require_auth
def get_simplified_tags(instance_id):
    url = f"{config.ORTHANC_URL}/instances/{instance_id}/simplified-tags"

    if request.query_string:
        url += f"?{request.query_string.decode('utf-8')}"

    headers = {
        key: value
        for key, value in request.headers
        if key.lower() not in EXCLUDED_HEADERS
    }
    payload = request.get_data()
    auth = _get_orthanc_auth()

    try:
        resp = _request_orthanc(
            url=url,
            headers=headers,
            payload=payload,
            auth=auth,
            timeout=TIMEOUT_DEFAULT,
            stream=False,
        )
        resp = _retry_with_global_auth_if_unauthorized(
            resp=resp,
            url=url,
            headers=headers,
            payload=payload,
            auth=auth,
            timeout=TIMEOUT_DEFAULT,
            stream=False,
        )

        if resp.status_code == 401:
            resp.close()
            return Response(
                '{"error": "Falha de autenticacao com o Orthanc. Verifique sincronizacao do usuario e credenciais globais."}',
                status=502,
                content_type="application/json",
            )

        if resp.status_code != 200:
            return Response(
                resp.content,
                status=resp.status_code,
                content_type=resp.headers.get("content-type", "application/json"),
            )

        try:
            payload = resp.json()
        except ValueError:
            return Response(
                '{"error": "Resposta invalida de simplified-tags no Orthanc"}',
                status=502,
                content_type="application/json",
            )

        return jsonify(_normalize_simplified_tags_payload(payload))

    except requests.ConnectionError:
        return Response('{"error": "Orthanc indisponivel"}', status=502, content_type="application/json")
    except requests.Timeout:
        return Response('{"error": "Timeout na conexao com Orthanc"}', status=504, content_type="application/json")
    except requests.RequestException:
        return Response('{"error": "Erro de comunicacao com Orthanc"}', status=502, content_type="application/json")


@proxy_bp.route("/instances/<instance_id>/tags", methods=["GET"])
@require_auth
def get_tags(instance_id):
    return proxy_request(f"/instances/{instance_id}/tags")


@proxy_bp.route("/instances/<instance_id>/content", methods=["GET"])
@require_auth
def get_instance_content(instance_id):
    return proxy_request(f"/instances/{instance_id}/content")


@proxy_bp.route("/instances/<instance_id>/content/<path:content_path>", methods=["GET"])
@require_auth
def get_instance_content_path(instance_id, content_path):
    return proxy_request(f"/instances/{instance_id}/content/{content_path}")


@proxy_bp.route("/studies/<study_id>/series", methods=["GET"])
@require_auth
def get_study_series(study_id):
    return proxy_request(f"/studies/{study_id}/series")


@proxy_bp.route("/patients/<patient_id>/studies", methods=["GET"])
@require_auth
def get_patient_studies(patient_id):
    return proxy_request(f"/patients/{patient_id}/studies")

