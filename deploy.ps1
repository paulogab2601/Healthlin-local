param(
    [string]$User = "orthanc",
    [string]$ServerHost = "192.168.1.100",
    [int]$Port = 22
)

$ErrorActionPreference = "Stop"

if ($User -match "@") {
    $Target = $User
}
else {
    $Target = "$User@$ServerHost"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ViewerDir = Join-Path $ScriptDir "viewer"
$BackendDir = Join-Path $ScriptDir "backend"

if (-not (Test-Path $ViewerDir)) {
    throw "Diretorio do frontend nao encontrado: $ViewerDir"
}

if (-not (Test-Path $BackendDir)) {
    throw "Diretorio do backend nao encontrado: $BackendDir"
}

$BackendFiles = @(
    "app.py",
    "auth.py",
    "config.py",
    "events.py",
    "models.py",
    "proxy.py",
    "orthanc_sync.py",
    "requirements.txt",
    "healthlin-backend.service"
)

$MissingBackendFiles = $BackendFiles | Where-Object { -not (Test-Path (Join-Path $BackendDir $_)) }
if ($MissingBackendFiles.Count -gt 0) {
    throw "Arquivos de backend ausentes: $($MissingBackendFiles -join ', ')"
}

Write-Host "==> Build frontend"
Push-Location $ViewerDir
try {
    & npm ci
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no npm ci"
    }

    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no npm run build"
    }
}
finally {
    Pop-Location
}

Write-Host "==> Create remote staging dir"
$RemoteTmpOutput = & ssh -p $Port $Target 'TMP_DIR=$(mktemp -d /tmp/healthlin-deploy-XXXXXX); mkdir -p "$TMP_DIR/backend"; echo "$TMP_DIR"'
if ($LASTEXITCODE -ne 0 -or $null -eq $RemoteTmpOutput -or $RemoteTmpOutput.Count -eq 0) {
    throw "Falha ao criar diretorio temporario remoto"
}
$RemoteTmp = ($RemoteTmpOutput | Select-Object -Last 1).Trim()
if (-not $RemoteTmp.StartsWith("/tmp/healthlin-deploy-")) {
    throw "Diretorio temporario remoto invalido: $RemoteTmp"
}

Write-Host "==> Upload frontend dist -> ${Target}:$RemoteTmp/frontend"
& scp -P $Port -r "$(Join-Path $ViewerDir 'dist')" "${Target}:$RemoteTmp/frontend"
if ($LASTEXITCODE -ne 0) {
    throw "Falha no upload do frontend"
}

Write-Host "==> Upload backend files -> ${Target}:$RemoteTmp/backend"
$BackendFilePaths = $BackendFiles | ForEach-Object { Join-Path $BackendDir $_ }
& scp -P $Port $BackendFilePaths "${Target}:$RemoteTmp/backend/"
if ($LASTEXITCODE -ne 0) {
    throw "Falha no upload do backend"
}

Write-Host "==> Install backend deps + restart service (sudo)"
$RemoteDeployScript = @'
set -euo pipefail
TMP_DIR="$1"
if [ -z "$TMP_DIR" ] || [ ! -d "$TMP_DIR" ]; then
  echo "TMP_DIR invalido: $TMP_DIR" >&2
  exit 1
fi
trap 'rm -rf "$TMP_DIR"' EXIT

sudo mkdir -p /opt/healthlin/frontend/dist /opt/healthlin/backend

sudo rm -rf /opt/healthlin/frontend/dist/*
sudo cp -a "$TMP_DIR/frontend/." /opt/healthlin/frontend/dist/

sudo cp -a "$TMP_DIR/backend/app.py" /opt/healthlin/backend/app.py
sudo cp -a "$TMP_DIR/backend/auth.py" /opt/healthlin/backend/auth.py
sudo cp -a "$TMP_DIR/backend/config.py" /opt/healthlin/backend/config.py
sudo cp -a "$TMP_DIR/backend/events.py" /opt/healthlin/backend/events.py
sudo cp -a "$TMP_DIR/backend/models.py" /opt/healthlin/backend/models.py
sudo cp -a "$TMP_DIR/backend/proxy.py" /opt/healthlin/backend/proxy.py
sudo cp -a "$TMP_DIR/backend/orthanc_sync.py" /opt/healthlin/backend/orthanc_sync.py
sudo cp -a "$TMP_DIR/backend/requirements.txt" /opt/healthlin/backend/requirements.txt

sudo install -m 0644 "$TMP_DIR/backend/healthlin-backend.service" /etc/systemd/system/healthlin-backend.service

sudo /opt/healthlin/venv/bin/pip install -r /opt/healthlin/backend/requirements.txt
sudo systemctl daemon-reload
sudo systemctl restart healthlin-backend
sudo systemctl --no-pager --full status healthlin-backend

echo -n "Aguardando servico..."
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:5000/api/health 2>/dev/null; then
    echo ""
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo ""
    echo "Servico nao respondeu apos 15s. Logs:" >&2
    sudo journalctl -u healthlin-backend -n 30 --no-pager >&2
    exit 1
  fi
  printf '.'
  sleep 1
done
'@

$LocalTmpScript = [System.IO.Path]::GetTempFileName()
try {
    [System.IO.File]::WriteAllText($LocalTmpScript, $RemoteDeployScript, [System.Text.UTF8Encoding]::new($false))
    & scp -P $Port $LocalTmpScript "${Target}:$RemoteTmp/deploy.sh"
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no upload do script de deploy"
    }
    & ssh -tt -p $Port $Target "bash '$RemoteTmp/deploy.sh' '$RemoteTmp'"
    if ($LASTEXITCODE -ne 0) {
        throw "Falha no deploy remoto"
    }
} finally {
    Remove-Item $LocalTmpScript -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Deploy concluido."
if ($Target -match "@") {
    $DisplayHost = $Target.Split("@", 2)[1]
}
else {
    $DisplayHost = $ServerHost
}
Write-Host "URL: http://$DisplayHost`:5000"
Write-Host "Logs: ssh -p $Port $Target 'sudo journalctl -u healthlin-backend -f'"
