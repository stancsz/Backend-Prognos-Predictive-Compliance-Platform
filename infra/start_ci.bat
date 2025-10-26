@echo off
REM Kill any existing node processes
taskkill /F /IM node.exe >nul 2>nul || echo no-node

REM Start API + Worker with clean env per-process. Logs go to %TEMP%.
REM Each process sets its env vars inline to avoid inheritance/trailing-space issues.

REM Start API in background with explicit per-process env
start "api" /B cmd /C "set \"PORT=4000\" && set \"DATABASE_URL=postgres://devuser:devpass@localhost:5432/plts_dev\" && set \"AWS_ENDPOINT=http://localhost:9000\" && set \"AWS_ACCESS_KEY_ID=minioadmin\" && set \"AWS_SECRET_ACCESS_KEY=minioadmin\" && set \"S3_BUCKET=local-minio-bucket\" && npm --prefix packages/api run dev > \"%TEMP%\\ci_api.log\" 2> \"%TEMP%\\ci_api_err.log\""

REM Small pause then start worker the same way
timeout /t 2 >nul
start "worker" /B cmd /C "set \"PORT=4001\" && set \"DATABASE_URL=postgres://devuser:devpass@localhost:5432/plts_dev\" && set \"AWS_ENDPOINT=http://localhost:9000\" && set \"AWS_ACCESS_KEY_ID=minioadmin\" && set \"AWS_SECRET_ACCESS_KEY=minioadmin\" && set \"S3_BUCKET=local-minio-bucket\" && npm --prefix packages/worker run dev > \"%TEMP%\\ci_worker.log\" 2> \"%TEMP%\\ci_worker_err.log\""

timeout /t 2 >nul
echo started
