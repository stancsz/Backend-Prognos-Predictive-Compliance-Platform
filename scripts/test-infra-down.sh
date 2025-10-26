#!/usr/bin/env bash
set -euo pipefail

echo "Tearing down infra via docker-compose..."
docker compose -f infra/docker-compose.yml down -v

echo "Teardown complete."
