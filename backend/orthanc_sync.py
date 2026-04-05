import json
import subprocess
import logging
import threading
import config
import models

logger = logging.getLogger(__name__)

# ── Sync serializado com debounce ─────────────────────
_sync_lock = threading.Lock()       # serializa execuções de sync
_timer_lock = threading.Lock()      # protege acesso ao timer
_debounce_timer: threading.Timer | None = None
_DEBOUNCE_SECONDS = 5.0


def request_sync():
    """Agenda um sync com debounce. Chamadas rápidas consecutivas consolidam em uma só."""
    global _debounce_timer
    with _timer_lock:
        if _debounce_timer is not None:
            _debounce_timer.cancel()
        _debounce_timer = threading.Timer(_DEBOUNCE_SECONDS, _execute_sync)
        _debounce_timer.daemon = True
        _debounce_timer.start()


def _execute_sync():
    """Executa sync_orthanc_users com lock exclusivo."""
    global _debounce_timer
    with _timer_lock:
        _debounce_timer = None
    with _sync_lock:
        sync_orthanc_users()


def sync_orthanc_users():
    """
    Sobrescreve /etc/orthanc/credentials.json com os usuários ativos da interface
    e reinicia o Orthanc **somente se as credenciais mudaram**.

    O username no Orthanc é composto por council_type + council_number
    para evitar colisões (ex: 'CRM__4214-MG').
    A conta admin global (ORTHANC_USER/ORTHANC_PASS) é sempre preservada.
    """
    try:
        # Monta RegisteredUsers: todos os usuários ativos + admin global por último.
        # O admin global é inserido APÓS o loop para nunca ser sobrescrito por um
        # usuário da app que tenha o mesmo council_number (ex: "admin").
        registered = {}

        for user in models.list_users_with_credentials():
            registered[user["orthanc_username"]] = user["password"]

        # Admin global sempre vence — inserido por último
        registered[config.ORTHANC_USER] = config.ORTHANC_PASS

        credentials = {"RegisteredUsers": registered}
        new_content = json.dumps(credentials, indent=2, ensure_ascii=False)

        # Compara com o arquivo atual — pula restart se nada mudou
        try:
            with open(config.ORTHANC_CREDENTIALS_PATH, "r", encoding="utf-8") as f:
                current_content = f.read()
            if current_content == new_content:
                logger.debug("Orthanc sync: credenciais inalteradas, restart evitado.")
                return True, "Nenhuma alteração"
        except FileNotFoundError:
            pass  # Arquivo não existe ainda, prossegue normalmente

        with open(config.ORTHANC_CREDENTIALS_PATH, "w", encoding="utf-8") as f:
            f.write(new_content)

        # Tenta reload gracioso primeiro (preserva conexões ativas);
        # se o serviço não suportar reload, faz restart como fallback.
        reload_result = subprocess.run(
            ["systemctl", "reload", "orthanc"],
            capture_output=True,
            timeout=30,
        )
        if reload_result.returncode != 0:
            subprocess.run(
                ["systemctl", "restart", "orthanc"],
                check=True,
                timeout=30,
            )

        logger.info("Orthanc sync concluído: %d usuário(s) registrado(s).", len(registered))
        return True, "Sync concluído"

    except subprocess.CalledProcessError as e:
        msg = f"Falha ao reiniciar Orthanc: {e}"
        logger.error(msg)
        return False, msg
    except Exception as e:
        msg = f"Erro no sync Orthanc: {e}"
        logger.error(msg)
        return False, msg
