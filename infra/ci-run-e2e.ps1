#!/usr/bin/env pwsh
# PowerShell reproduction of infra/ci-run-e2e.sh for Windows/PowerShell environments.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Path $PSScriptRoot -Parent
if (-not $RootDir) { $RootDir = (Get-Location).Path }
Write-Host "=== Starting local CI E2E reproduction (PowerShell) ==="
Push-Location $RootDir

function Wait-ForPort {
  param(
    [string]$Host = 'localhost',
    [int]$Port,
    [int]$Attempts = 30,
    [int]$DelaySec = 2
  )
  for ($i = 0; $i -lt $Attempts; $i++) {
    if (Test-NetConnection -ComputerName $Host -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet) {
      Write-Host "$Host:$Port is reachable"
      return $true
    }
    Write-Host "Waiting for $Host:$Port..."
    Start-Sleep -Seconds $DelaySec
  }
  return $false
}

Write-Host "1) Start infra (Postgres + MinIO) via docker-compose"
docker-compose -f infra/docker-compose.yml up -d --build

Write-Host "2) Wait for services"
if (-not (Wait-ForPort -Host 'localhost' -Port 5432 -Attempts 30)) {
  Write-Error "Postgres did not start in time"
  docker-compose -f infra/docker-compose.yml logs
  Pop-Location
  exit 1
}
if (-not (Wait-ForPort -Host 'localhost' -Port 9000 -Attempts 30)) {
  Write-Error "MinIO did not start in time"
  docker-compose -f infra/docker-compose.yml logs
  Pop-Location
  exit 1
}

Write-Host "3) Install package dependencies"
npm install --prefix packages/api
npm install --prefix packages/worker

Write-Host "4) Ensure MinIO bucket (idempotent)"
try {
  node packages/api/scripts/create_minio_bucket.js
} catch {
  Write-Warning "create_minio_bucket.js exited non-zero (continuing)"
}

Write-Host "5) Apply DB migration"
# Expose known docker-compose Postgres creds used in infra/docker-compose.yml
$env:POSTGRES_USER = 'devuser'
$env:POSTGRES_PASSWORD = 'devpass'
$env:POSTGRES_DB = 'plts_dev'
$env:POSTGRES_HOST = 'localhost'
$env:POSTGRES_PORT = '5432'

npm --prefix packages/api run migrate

Write-Host "6) Start worker and API in background (logs -> $env:TEMP)"
$workerLog = Join-Path $env:TEMP 'ci_worker.log'
$workerErr = Join-Path $env:TEMP 'ci_worker_err.log'
$apiLog = Join-Path $env:TEMP 'ci_api.log'
$apiErr = Join-Path $env:TEMP 'ci_api_err.log'

# Start worker
$workerProc = Start-Process -FilePath npm -ArgumentList '--prefix','packages/worker','run','dev' -RedirectStandardOutput $workerLog -RedirectStandardError $workerErr -NoNewWindow -PassThru
Start-Sleep -Seconds 1

# Start API
$apiProc = Start-Process -FilePath npm -ArgumentList '--prefix','packages/api','run','dev' -RedirectStandardOutput $apiLog -RedirectStandardError $apiErr -NoNewWindow -PassThru
Start-Sleep -Seconds 1

Write-Host "7) Wait for API readiness"
$apiReady = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    Invoke-WebRequest -Uri 'http://localhost:3000/' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop | Out-Null
    Write-Host "API is responding"
    $apiReady = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}
if (-not $apiReady) {
  Write-Error "API did not start in time. Dumping API log:"
  Get-Content $apiLog -ErrorAction SilentlyContinue | Select-Object -Last 200
  Pop-Location
  exit 1
}

Write-Host "8) Run E2E upload test"
try {
  node packages/api/test/upload_e2e.js
  $e2eExit = 0
} catch {
  $e2eExit = $LASTEXITCODE
  if (-not $e2eExit) { $e2eExit = 1 }
}

if ($e2eExit -ne 0) {
  Write-Error "E2E test failed; dumping logs"
  Write-Host "=== API STDOUT ==="
  Get-Content $apiLog -ErrorAction SilentlyContinue | Select-Object -Last 500
  Write-Host "=== API STDERR ==="
  Get-Content $apiErr -ErrorAction SilentlyContinue | Select-Object -Last 500
  Write-Host "=== WORKER STDOUT ==="
  Get-Content $workerLog -ErrorAction SilentlyContinue | Select-Object -Last 500
  Write-Host "=== WORKER STDERR ==="
  Get-Content $workerErr -ErrorAction SilentlyContinue | Select-Object -Last 500

  Write-Host "Bringing down infra"
  docker-compose -f infra/docker-compose.yml down -v
  Pop-Location
  exit $e2eExit
}

Write-Host "E2E succeeded. Fetching DB evidence row for verification"
# Try to show latest evidence row (requires docker)
$postgresContainer = (docker ps --filter "ancestor=postgres:15-alpine" --format "{{.Names}}" | Select-Object -First 1)
if ($postgresContainer) {
  docker exec -i $postgresContainer sh -c "psql -U \${POSTGRES_USER:-postgres} -d \${POSTGRES_DB:-postgres} -c \"SELECT id, status, checksum, length(coalesce(extracted_text,'')) as extracted_len, created_at, indexed_at FROM evidence ORDER BY created_at DESC LIMIT 5;\""
} else {
  Write-Warning "Postgres container not found for verification"
}

Write-Host "Tearing down infra"
docker-compose -f infra/docker-compose.yml down -v

Pop-Location
Write-Host "=== Local CI E2E reproduction complete ==="
exit 0
