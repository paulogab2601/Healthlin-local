#!/bin/bash
# ── Healthlin Backend - Instalação ──────────────────

set -e

echo ">>> Instalando dependências do sistema..."
sudo apt update
sudo apt install -y python3-pip python3-venv

echo ">>> Criando diretórios..."
sudo mkdir -p /opt/healthlin/backend

echo ">>> Copiando arquivos..."
sudo cp app.py config.py models.py auth.py proxy.py requirements.txt /opt/healthlin/backend/

echo ">>> Criando ambiente virtual..."
sudo python3 -m venv /opt/healthlin/venv

echo ">>> Instalando dependências Python..."
sudo /opt/healthlin/venv/bin/pip install -r /opt/healthlin/backend/requirements.txt

echo ">>> Configurando serviço systemd..."
sudo cp healthlin-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable healthlin-backend
sudo systemctl start healthlin-backend

echo ""
echo "============================================"
echo "  Healthlin Backend instalado com sucesso!"
echo "  URL: http://localhost:5000"
echo "  Status: sudo systemctl status healthlin-backend"
echo "  Logs: sudo journalctl -u healthlin-backend -f"
echo "============================================"
