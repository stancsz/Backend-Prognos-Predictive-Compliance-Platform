#!/usr/bin/env bash
set -euo pipefail

echo "Bringing up infra via docker-compose..."
docker compose -f infra/docker-compose.yml up --build -d

echo "Waiting for API and MinIO readiness (up to ~2 minutes)..."
for i in $(seq 1 60); do
  if curl -fsS http://localhost:4000/ready >/dev/null 2>&1 && curl -fsS http://localhost:9000/minio/health/ready >/dev/null 2>&1; then
    echo "services ready"
    echo "Ensuring MinIO bucket exists (local helper)..."
    AWS_ENDPOINT=${AWS_ENDPOINT:-http://localhost:9000} AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-minioadmin} AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-minioadmin} S3_BUCKET=${S3_BUCKET:-local-minio-bucket} node packages/api/scripts/create_minio_bucket.js || true
    exit 0
  fi
  echo "waiting for services... ($i/60)"
  sleep 2
done

echo "services failed to become ready" >&2
exit 1
