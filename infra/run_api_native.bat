@echo off
setlocal
REM Inline envs for this API process only (uses FORCE_DB_URL to avoid corrupted global env)
set "PORT=3000"
set "FORCE_DB_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "AWS_ENDPOINT=http://localhost:9000"
set "AWS_ACCESS_KEY_ID=minioadmin"
set "AWS_SECRET_ACCESS_KEY=minioadmin"
set "S3_BUCKET=local-minio-bucket"

REM Write hex dumps from this exact shell for forensic comparison
node infra\scripts\write_env_hex.js

REM Start the API in a background cmd.exe (native) and redirect logs to %TEMP%
start "" /B cmd /C "npm --prefix packages/api run dev > \"%TEMP%\ci_api.log\" 2> \"%TEMP%\ci_api_err.log\""

echo started
endlocal
