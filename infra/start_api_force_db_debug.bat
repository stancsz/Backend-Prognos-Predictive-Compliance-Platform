@echo off
REM Debug runner: set FORCE_DB_URL and S3 envs, write visible dump and UTF-8 hex dumps, then start API
set "PORT=3000"
set "FORCE_DB_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "AWS_ENDPOINT=http://localhost:9000"
set "AWS_ACCESS_KEY_ID=minioadmin"
set "AWS_SECRET_ACCESS_KEY=minioadmin"
set "S3_BUCKET=local-minio-bucket"

REM Visible env dump for quick inspection
> "%TEMP%\ci_api_env.txt" echo FORCE_DB_URL=[%FORCE_DB_URL%]
>> "%TEMP%\ci_api_env.txt" echo DATABASE_URL=[%DATABASE_URL%]
>> "%TEMP%\ci_api_env.txt" echo S3_BUCKET=[%S3_BUCKET%]
>> "%TEMP%\ci_api_env.txt" echo AWS_ENDPOINT=[%AWS_ENDPOINT%]
>> "%TEMP%\ci_api_env.txt" echo AWS_ACCESS_KEY_ID=[%AWS_ACCESS_KEY_ID%]
>> "%TEMP%\ci_api_env.txt" echo AWS_SECRET_ACCESS_KEY=[%AWS_SECRET_ACCESS_KEY%]

REM Write UTF-8 hex dumps of the values so we can inspect exact bytes seen by the shell
powershell -NoProfile -Command ^
  "function ToHex($bytes){$bytes | ForEach-Object { '{0:X2}' -f $_ } -join ' ' } ; ^
   \$b = [System.Text.Encoding]::UTF8.GetBytes(\$env:FORCE_DB_URL); ToHex \$b | Out-File -Encoding ascii '%TEMP%\ci_api_env_FORCE_DB_URL_hex.txt' ; ^
   \$b2 = [System.Text.Encoding]::UTF8.GetBytes(\$env:S3_BUCKET); ToHex \$b2 | Out-File -Encoding ascii '%TEMP%\ci_api_env_S3_BUCKET_hex.txt' ; ^
   Write-Host 'wrote hex dumps'"

REM Start API in background; stdout/stderr redirected to TEMP
start "api" /B cmd /C "npm --prefix packages/api run dev > "%TEMP%\ci_api.log" 2> "%TEMP%\ci_api_err.log""
echo started-debug
