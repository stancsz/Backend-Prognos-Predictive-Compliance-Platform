@echo off
REM Kill any existing node processes
taskkill /F /IM node.exe >nul 2>nul || echo no-node

REM Set explicit env for this process only
set "PORT=4000"
set "DATABASE_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "AWS_ENDPOINT=http://localhost:9000"
set "AWS_ACCESS_KEY_ID=minioadmin"
set "AWS_SECRET_ACCESS_KEY=minioadmin"
set "S3_BUCKET=local-minio-bucket"

REM Start API in background and redirect logs to %TEMP%
start "api" /B cmd /C "npm --prefix packages/api run dev > \"%TEMP%\\ci_api.log\" 2> \"%TEMP%\\ci_api_err.log\""

echo started
