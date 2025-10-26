@echo off
setlocal
REM Debug worker starter (native cmd). Sets envs reliably, writes hex dumps, then runs worker in foreground.
set "DATABASE_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "AWS_ENDPOINT=http://localhost:9000"
set "AWS_ACCESS_KEY_ID=minioadmin"
set "AWS_SECRET_ACCESS_KEY=minioadmin"
set "S3_BUCKET=local-minio-bucket"

node infra\scripts\write_env_hex.js

REM Run worker in foreground using deterministic dev:debug script (avoids ts-node-dev respawn).
REM Redirect stdout/stderr to %TEMP% so we can tail logs from other shells.
npm --prefix packages/worker run dev:debug > "%TEMP%\ci_worker.log" 2> "%TEMP%\ci_worker_err.log"

endlocal
