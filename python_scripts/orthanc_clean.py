#!/usr/bin/env python3
"""
Orthanc Cleanup Script
Apaga estudos DICOM com mais de 45 dias (baseado na data de recebimento).
Rodar via cron diariamente.
"""

import requests
from datetime import datetime, timedelta
import logging

# ===================== CONFIGURAÇÕES =====================
ORTHANC_URL = "http://localhost:8042"
ORTHANC_USER = "seu_usuario"
ORTHANC_PASS = "sua_senha"
MAX_DAYS = 45
LOG_FILE = "/var/log/orthanc-cleanup.log"
# =========================================================

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

auth = (ORTHANC_USER, ORTHANC_PASS)
cutoff = datetime.now() - timedelta(days=MAX_DAYS)

try:
    response = requests.get(f"{ORTHANC_URL}/studies", auth=auth, timeout=30)
    response.raise_for_status()
    studies = response.json()
except requests.RequestException as e:
    logging.error(f"Erro ao conectar no Orthanc: {e}")
    exit(1)

deleted = 0
errors = 0

for study_id in studies:
    try:
        info = requests.get(f"{ORTHANC_URL}/studies/{study_id}", auth=auth, timeout=30).json()
        last_update = info.get("LastUpdate")

        if not last_update:
            continue

        study_date = datetime.strptime(last_update[:8], "%Y%m%d")

        if study_date < cutoff:
            patient = info.get("PatientMainDicomTags", {}).get("PatientName", "N/A")
            study_desc = info.get("MainDicomTags", {}).get("StudyDescription", "N/A")
            num_series = len(info.get("Series", []))

            res = requests.delete(f"{ORTHANC_URL}/studies/{study_id}", auth=auth, timeout=30)
            res.raise_for_status()

            logging.info(
                f"DELETADO | ID: {study_id} | Paciente: {patient} | "
                f"Desc: {study_desc} | Series: {num_series} | "
                f"Recebido: {last_update[:10]}"
            )
            deleted += 1

    except requests.RequestException as e:
        logging.error(f"Erro no estudo {study_id}: {e}")
        errors += 1

logging.info(
    f"Limpeza concluída | "
    f"Total: {len(studies)} | Deletados: {deleted} | Erros: {errors} | "
    f"Corte: {cutoff.strftime('%Y-%m-%d')}"
)