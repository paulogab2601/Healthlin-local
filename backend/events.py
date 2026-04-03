from blinker import signal

# Emitido quando credenciais de usuário são criadas, alteradas ou (des)ativadas.
# Subscribers (ex: orthanc_sync) reagem sem que a camada de auth os conheça.
user_changed = signal("user-changed")
