@echo off
REM Run local CI: start API + worker and run idempotency E2E in a single cmd.exe session
REM Usage: open cmd.exe, cd to repository root, then run infra\run_local_ci.bat

REM Kill stray node processes (non-fatal)
taskkill /F /IM node.exe /T >nul 2>&1 || echo no-node

REM Inline, clean environment for this session
set "DATABASE_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "FORCE_DB_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "API_BASE=http://localhost:4000"
set "AWS_ENDPOINT=http://localhost:9000"
set "AWS_ACCESS_KEY_ID=minioadmin"
set "AWS_SECRET_ACCESS_KEY=minioadmin"
set "S3_BUCKET=local-minio-bucket"

echo ==== env check ====
echo DATABASE_URL=%DATABASE_URL%
echo FORCE_DB_URL=%FORCE_DB_URL%
echo API_BASE=%API_BASE%
echo AWS_ENDPOINT=%AWS_ENDPOINT%
echo S3_BUCKET=%S3_BUCKET%

REM Start API and worker using existing helper (they redirect logs to %%TEMP%%\ci_*.log)
call infra\start_ci.bat

REM Give processes a moment to initialize
timeout /t 4 >nul

echo ==== tail API/WORKER logs ====
if exist %TEMP%\ci_api.log (type %TEMP%\ci_api.log) else (echo no-api-log)
if exist %TEMP%\ci_api_err.log (type %TEMP%\ci_api_err.log) else (echo no-api-err)
if exist %TEMP%\ci_worker.log (type %TEMP%\ci_worker.log) else (echo no-worker-log)
if exist %TEMP%\ci_worker_err.log (type %TEMP%\ci_worker_err.log) else (echo no-worker-err)

echo ==== run E2E: worker_idempotency_e2e ====
node packages/api/test/worker_idempotency_e2e.js

echo ==== done ====
