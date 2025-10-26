@echo off
setlocal
REM Debug worker starter (native cmd). Sets envs reliably, writes hex dumps, then runs worker in foreground.
set "DATABASE_URL=postgres://devuser:devpass@localhost:5432/plts_dev"
set "AWS_ENDPOINT=http://localhost:9000"
set "AWS_ACCESS_KEY_ID=minioadmin"
set "AWS_SECRET_ACCESS_KEY=minioadmin"
set "S3_BUCKET=local-minio-bucket"

node infra\scripts\write_env_hex.js

REM Run worker in foreground so logs appear in the started cmd window.
npm --prefix packages/worker run dev

endlocal
