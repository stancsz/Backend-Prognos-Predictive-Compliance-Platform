@echo off
setlocal
REM Inline envs for worker process
set "DATABASE_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "AWS_ENDPOINT=http://localhost:9000"
set "AWS_ACCESS_KEY_ID=minioadmin"
set "AWS_SECRET_ACCESS_KEY=minioadmin"
set "S3_BUCKET=local-minio-bucket"

REM Write hex dumps from this exact shell for forensic comparison
node infra\scripts\write_env_hex.js

REM Start the worker in a background native cmd and redirect logs to %TEMP%
start "" /B cmd /C "npm --prefix packages/worker run dev > \"%TEMP%\ci_worker.log\" 2> \"%TEMP%\ci_worker_err.log\""

echo worker-started
endlocal
