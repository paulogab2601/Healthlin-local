"""Gunicorn configuration — roda bootstrap() apenas no processo master."""

from app import bootstrap

# Configuração de workers
workers = 4
threads = 4
worker_class = "gthread"
timeout = 130
bind = "0.0.0.0:5000"


def on_starting(server):
    """Executado uma única vez no master, antes do fork dos workers."""
    bootstrap()
