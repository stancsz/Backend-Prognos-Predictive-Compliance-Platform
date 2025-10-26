@echo off
REM Kill any existing node processes
taskkill /F /IM node.exe >nul 2>nul || echo no-node

REM Inline envs for this API process only (uses FORCE_DB_URL to avoid corrupted global env)
set "PORT=3000"
set "FORCE_DB_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "AWS_ENDPOINT=http://localhost:9000"
set "AWS_ACCESS_KEY_ID=minioadmin"
set "AWS_SECRET_ACCESS_KEY=minioadmin"
set "S3_BUCKET=local-minio-bucket"

REM Dump env values (visible delimiters) to detect trailing whitespace/newlines
> "%TEMP%\ci_api_env.txt" echo FORCE_DB_URL=[%FORCE_DB_URL%]
>> "%TEMP%\ci_api_env.txt" echo DATABASE_URL=[%DATABASE_URL%]
>> "%TEMP%\ci_api_env.txt" echo S3_BUCKET=[%S3_BUCKET%]
>> "%TEMP%\ci_api_env.txt" echo AWS_ENDPOINT=[%AWS_ENDPOINT%]
>> "%TEMP%\ci_api_env.txt" echo AWS_ACCESS_KEY_ID=[%AWS_ACCESS_KEY_ID%]
>> "%TEMP%\ci_api_env.txt" echo AWS_SECRET_ACCESS_KEY=[%AWS_SECRET_ACCESS_KEY%]

REM Start API in background and redirect logs to %TEMP%
start "api" /B cmd /C "npm --prefix packages/api run dev > \"%TEMP%\\ci_api.log\" 2> \"%TEMP%\\ci_api_err.log\""

echo started-force
