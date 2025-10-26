#!/usr/bin/env bash
set -euo pipefail

echo "Bringing up infra via docker-compose..."
docker compose -f infra/docker-compose.yml up --build -d

echo "Waiting for API and MinIO readiness (up to ~2 minutes)..."
for i in $(seq 1 60); do
  if curl -fsS http://localhost:4000/ready >/dev/null 2>&1 && curl -fsS http://localhost:9000/minio/health/ready >/dev/null 2>&1; then
    echo "services ready"
    exit 0
  fi
  echo "waiting for services... ($i/60)"
  sleep 2
done

echo "services failed to become ready" >&2
exit 1
