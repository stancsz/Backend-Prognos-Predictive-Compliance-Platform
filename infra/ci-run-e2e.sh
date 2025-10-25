#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Starting local CI E2E reproduction ==="
cd "$ROOT_DIR"

echo "1) Start infra (Postgres + MinIO) via docker-compose"
docker-compose -f infra/docker-compose.yml up -d --build

echo "2) Wait for services"
# wait for postgres
for i in {1..30}; do
  if nc -z localhost 5432; then
    echo "Postgres is up"
    break
  fi
  echo "Waiting for Postgres..."
  sleep 2
done

# wait for minio
for i in {1..30}; do
  if nc -z localhost 9000; then
    echo "MinIO is up"
    break
  fi
  echo "Waiting for MinIO..."
  sleep 2
done

echo "3) Install package dependencies"
npm install --prefix packages/api
npm install --prefix packages/worker

echo "4) Ensure MinIO bucket (idempotent)"
node packages/api/scripts/create_minio_bucket.js || echo "create_minio_bucket.js exited non-zero (continuing)"

echo "5) Apply DB migration"
POSTGRES_CONTAINER=$(docker ps --filter "ancestor=postgres:15-alpine" --format "{{.Names}}" | head -n1)
if [ -n "$POSTGRES_CONTAINER" ]; then
  echo "Applying migration to $POSTGRES_CONTAINER"
  docker exec -i "$POSTGRES_CONTAINER" sh -c 'psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres}' < infra/migrations/001_create_evidence.sql
else
  echo "Postgres container not found" >&2
  docker-compose -f infra/docker-compose.yml logs
  exit 1
fi

echo "6) Start worker and API in background (logs -> /tmp)"
npm --prefix packages/worker run dev &> /tmp/ci_worker.log &
WORKER_PID=$!
sleep 1

npm --prefix packages/api run dev &> /tmp/ci_api.log &
API_PID=$!
sleep 1

echo "7) Wait for API readiness"
for i in {1..30}; do
  if curl -sS http://localhost:3000/ >/dev/null 2>&1 || curl -sS http://localhost:3000/uploads >/dev/null 2>&1; then
    echo "API is responding"
    break
  fi
  echo "Waiting for API..."
  sleep 2
done

echo "8) Run E2E upload test"
set -o pipefail
node packages/api/test/upload_e2e.js

E2E_EXIT=$?

if [ $E2E_EXIT -ne 0 ]; then
  echo "E2E test failed; dumping logs"
  echo "=== API LOG ==="
  sed -n '1,500p' /tmp/ci_api.log || true
  echo "=== WORKER LOG ==="
  sed -n '1,500p' /tmp/ci_worker.log || true
  echo "Bringing down infra"
  docker-compose -f infra/docker-compose.yml down -v
  exit $E2E_EXIT
fi

echo "E2E succeeded. Fetching DB evidence row for verification"
# Try to show latest evidence row
docker exec -i "$POSTGRES_CONTAINER" sh -c "psql -U \${POSTGRES_USER:-postgres} -d \${POSTGRES_DB:-postgres} -c \"SELECT id, status, checksum, length(coalesce(extracted_text,'')) as extracted_len, created_at, indexed_at FROM evidence ORDER BY created_at DESC LIMIT 5;\""

echo "Tearing down infra"
docker-compose -f infra/docker-compose.yml down -v

echo "=== Local CI E2E reproduction complete ==="
exit 0
