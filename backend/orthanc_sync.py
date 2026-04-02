import json
import subprocess
import logging
import config
import models

logger = logging.getLogger(__name__)


def sync_orthanc_users():
    """
    Sobrescreve /etc/orthanc/credentials.json com os usuários ativos da interface
    e reinicia o Orthanc para aplicar as mudanças.

    O username no Orthanc é o council_number do usuário (ex: '4214-MG').
    A conta admin global (ORTHANC_USER/ORTHANC_PASS) é sempre preservada.
    """
    try:
        # Monta RegisteredUsers: todos os usuários ativos + admin global por último.
        # O admin global é inserido APÓS o loop para nunca ser sobrescrito por um
        # usuário da app que tenha o mesmo council_number (ex: "admin").
        registered = {}

        for user in models.list_users_with_credentials():
            registered[user["council_number"]] = user["password"]

        # Admin global sempre vence — inserido por último
        registered[config.ORTHANC_USER] = config.ORTHANC_PASS

        credentials = {"RegisteredUsers": registered}

        with open(config.ORTHANC_CREDENTIALS_PATH, "w", encoding="utf-8") as f:
            json.dump(credentials, f, indent=2, ensure_ascii=False)

        # Reinicia o Orthanc (o serviço roda como root, sem necessidade de sudo)
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
