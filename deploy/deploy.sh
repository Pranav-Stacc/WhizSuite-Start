#!/usr/bin/env bash
# Usage: deploy/deploy.sh <image-tag>
# Run from a checkout of the matching commit. Pulls API + agent images from ECR,
# runs migrations + seed, restarts services and waits for the API health check.
set -euo pipefail

IMAGE_TAG="${1:?usage: deploy.sh <image-tag>}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"

cd "$(dirname "${BASH_SOURCE[0]}")"
{
  echo "API_IMAGE_TAG=$IMAGE_TAG"
  echo "AGENT_IMAGE_TAG=$IMAGE_TAG"
} > .image-tag
COMPOSE=(docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml)

# Free space before pull so CI deploys do not fail with "no space left on device".
docker image prune -af --filter "until=24h" > /dev/null || true
docker builder prune -af > /dev/null || true

"${COMPOSE[@]}" pull api agent
"${COMPOSE[@]}" up -d postgres redis mailpit
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" up -d --remove-orphans agent api caddy

for ((i = 1; i <= HEALTH_RETRIES; i++)); do
  status="$(docker inspect --format '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q api)")"
  if [[ "$status" == "healthy" ]]; then
    echo "api healthy at $IMAGE_TAG"
    docker image prune -af --filter "until=72h" > /dev/null
    exit 0
  fi
  sleep 5
done

echo "api failed to become healthy" >&2
"${COMPOSE[@]}" logs --tail 100 api agent >&2
exit 1
