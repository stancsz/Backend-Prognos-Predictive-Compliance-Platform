# Run local CI & E2E (Windows)

Purpose
- Start API + worker with a clean inline-environment and run the idempotency E2E test in one native cmd.exe session to avoid Windows env expansion/quoting issues.

How to run (native cmd.exe)
1. Open cmd.exe.
2. Change directory to the repo root (where infra\run_local_ci.bat is).
3. Run:

```bat
infra\run_local_ci.bat
```

PowerShell-safe alternative (runs the batch inside cmd so %VAR% expansion happens inside cmd.exe):

```powershell
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','infra\run_local_ci.bat' -NoNewWindow -Wait
```

If the E2E fails — collect artifacts (run in same cmd session)
```bat
type %TEMP%\ci_api.log
type %TEMP%\ci_api_err.log
type %TEMP%\ci_worker.log
type %TEMP%\ci_worker_err.log
docker logs plts_postgres --tail 200
docker logs plts_minio --tail 200
docker exec -i plts_postgres psql -U devuser -d plts_dev -c "SELECT id, project_id, status, checksum, object_key FROM evidence ORDER BY created_at DESC LIMIT 20;"
```

Notes
- Run everything in a single cmd.exe session to ensure inline env vars (e.g. DATABASE_URL, S3_BUCKET) expand correctly.
- If you must run from PowerShell, use the PowerShell-safe alternative above so the actual process runs under cmd.exe.
- After running, paste the logs and SQL snapshot here and I will analyze failures and implement fixes.
