@echo off
REM Helper: restart API in native cmd, show logs, check readiness, run idempotency E2E, collect artifacts.
REM Run this from a native cmd.exe opened in the repository root.

echo Killing node processes...
taskkill /F /IM node.exe >nul 2>nul || echo no-node

echo Starting API via infra\start_api_force_db.bat...
call infra\start_api_force_db.bat

echo Waiting for API to start...
timeout /t 4 >nul

echo.
echo ==== API ENV DUMP ====
if exist "%TEMP%\ci_api_env.txt" (
  type "%TEMP%\ci_api_env.txt"
) else (
  echo no-env-dump
)

echo.
echo ==== API ERR (last 200 lines) ====
powershell -NoProfile -Command "if (Test-Path \"$env:TEMP\ci_api_err.log\") { Get-Content -Path \"$env:TEMP\ci_api_err.log\" -Tail 200 } else { Write-Host 'no-api-err' }"

echo.
echo ==== API OUT (last 200 lines) ====
powershell -NoProfile -Command "if (Test-Path \"$env:TEMP\ci_api.log\") { Get-Content -Path \"$env:TEMP\ci_api.log\" -Tail 200 } else { Write-Host 'no-api-out' }"

echo.
echo ==== CURL /health ====
powershell -NoProfile -Command "try { $h = Invoke-RestMethod -Uri 'http://localhost:3000/health' -Method Get -ErrorAction Stop; Write-Host ($h | ConvertTo-Json -Compress) } catch { Write-Host 'curl-failed' }"

echo.
echo ==== CURL /ready ====
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/ready' -Method Get -ErrorAction Stop; Write-Host ($r | ConvertTo-Json -Compress) } catch { Write-Host 'curl-failed' }"

echo.
echo ==== RUN E2E (worker_idempotency_e2e) ====
cd /d "%~dp0\.." 2>nul || cd /d "%CD%"
node packages/api/test/worker_idempotency_e2e.js

echo.
echo ==== IF E2E FAILED, COLLECTING ARTIFACTS ====
if exist "%TEMP%\ci_api_env.txt" (
  echo ==== API ENV DUMP (raw) ====
  type "%TEMP%\ci_api_env.txt"
)

echo ==== API ERR (tail 500) ====
powershell -NoProfile -Command "if (Test-Path \"$env:TEMP\ci_api_err.log\") { Get-Content -Path \"$env:TEMP\ci_api_err.log\" -Tail 500 } else { Write-Host 'no-api-err' }"

echo ==== API OUT (tail 500) ====
powershell -NoProfile -Command "if (Test-Path \"$env:TEMP\ci_api.log\") { Get-Content -Path \"$env:TEMP\ci_api.log\" -Tail 500 } else { Write-Host 'no-api-out' }"

echo ==== DOCKER LOGS plts_postgres (tail 200) ====
docker logs plts_postgres --tail 200 2>nul || echo docker-no-plts_postgres

echo ==== DOCKER LOGS plts_minio (tail 200) ====
docker logs plts_minio --tail 200 2>nul || echo docker-no-plts_minio

echo ==== EVIDENCE SNAPSHOT ====
docker exec -i plts_postgres psql -U devuser -d plts_dev -c "SELECT id, project_id, status, checksum, object_key FROM evidence ORDER BY created_at DESC LIMIT 20;" 2>nul || echo psql-query-failed

echo Done.
