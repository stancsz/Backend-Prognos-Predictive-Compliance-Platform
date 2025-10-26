# Next steps to diagnose worker indexing failure

1. Run the worker in a native cmd window (foreground) so you can observe logs directly:
   - Open cmd.exe (not PowerShell / VSCode integrated terminal).
   - From repo root:
     - node infra\scripts\write_env_hex.js
     - infra\start_worker_debug.bat
   - Watch the window for:
     - "Worker: resolved DATABASE_URL=..." (redacted)
     - "Worker: connected to Postgres"
     - "Worker: claimed N evidence items for processing"
     - Any S3 download errors / stack traces

2. If you prefer logs redirected to files (other shell):
   - Start in cmd:
     - infra\start_worker_debug.bat
   - Then tail files in another cmd:
     - type "%TEMP%\ci_worker.log"
     - type "%TEMP%\ci_worker_err.log"

3. Re-run the E2E after worker shows connected/claiming:
   - node packages/api/test/worker_idempotency_e2e.js
   - Then check evidence:
     - node infra/query_evidence_runner.js

4. If uploaded_pending rows persist:
   - Inspect %TEMP% hex files produced by write_env_hex.js:
     - type "%TEMP%\ci_api_env_DATABASE_URL_hex.txt"
     - type "%TEMP%\ci_api_env_S3_BUCKET_hex.txt"
   - Confirm there are no trailing 0x20 or control bytes.

5. If worker logs are not being created by background runners, avoid using `start /B cmd /C ...` redirections in PowerShell/VSCode and prefer foreground cmd.exe runs to avoid quoting/redirect issues.

Useful commands (copy-paste-friendly)
- node infra\scripts\write_env_hex.js
- infra\start_worker_debug.bat
- node packages/api/test/worker_idempotency_e2e.js
- node infra/query_evidence_runner.js
- type "%TEMP%\ci_api_env_DATABASE_URL_hex.txt"
- type "%TEMP%\ci_api_env_S3_BUCKET_hex.txt"
- type "%TEMP%\ci_worker.log"
- type "%TEMP%\ci_worker_err.log"

Checklist
- [ ] Run worker in native cmd foreground and observe logs
- [ ] Re-run E2E while worker is active
- [ ] Capture any S3/DB errors and hex dump artifacts
- [ ] Fix CI/wrapper envs if corruption found
