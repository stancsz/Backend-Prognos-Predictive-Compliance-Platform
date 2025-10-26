# Running the local CI E2E reproduction

This repository provides two scripts to reproduce the GitHub Actions E2E run locally:

- POSIX (Linux / macOS / Git Bash / WSL): infra/ci-run-e2e.sh
- PowerShell (Windows): infra/ci-run-e2e.ps1

If you attempted to run the POSIX script from PowerShell, you may see:
"execvpe(/bin/bash) failed: No such file or directory" — that means a POSIX shell is not available in the current terminal.

Recommended options

1) Run in WSL or Git Bash (recommended on Windows)
- Open WSL or Git Bash and run:
```bash
bash infra/ci-run-e2e.sh
```

2) Run the PowerShell reproduction (native Windows PowerShell / PowerShell Core)
- From PowerShell (PowerShell Core 'pwsh' preferred or Windows PowerShell):
  - If you have PowerShell Core:
    pwsh -File infra/ci-run-e2e.ps1
  - If only Windows PowerShell is available:
    powershell -File infra/ci-run-e2e.ps1
- Note: the environment where the script runs must have Docker + docker-compose and Node.js available in PATH.

3) Run the minimal migration step manually (if you only need migrations)
- From PowerShell:
```powershell
$env:POSTGRES_USER = 'devuser'
$env:POSTGRES_PASSWORD = 'devpass'
$env:POSTGRES_DB = 'plts_dev'
$env:POSTGRES_HOST = 'localhost'
$env:POSTGRES_PORT = '5432'
npm --prefix packages/api run migrate
```

Troubleshooting
- Ensure Docker Desktop is running and exposes ports 5432 and 9000.
- If PowerShell reports 'pwsh' not found, install PowerShell Core or use `powershell`.
- Logs produced by the PowerShell runner are placed in $env:TEMP (ci_api.log / ci_worker.log). POSIX runner writes to /tmp.

If you want me to try running a reproduction here, grant permission and specify which shell you prefer (bash / pwsh).
