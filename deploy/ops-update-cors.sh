#!/usr/bin/env bash
# Updates live API CORS / web URL on the EC2 host. Run from /opt/whizsuite/deploy.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
ENV_FILE=.env

test -f "$ENV_FILE" || { echo "missing $ENV_FILE" >&2; exit 1; }

upsert() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

# Exact apex + single-label wildcard (crm-{slug}, finance-{slug}, {slug}).
upsert CORS_ORIGINS 'https://whizsuite.com,https://www.whizsuite.com,https://*.whizsuite.com,https://whizsuite.praanav.in,https://www.whizsuite.praanav.in,https://*.whizsuite.praanav.in,http://localhost:3000'
upsert WEB_APP_URL 'https://whizsuite.com'
upsert API_DOMAIN 'api.whizsuite.praanav.in'
upsert COOKIE_DOMAIN 'api.whizsuite.praanav.in'

echo 'Updated:'
grep -E '^(CORS_ORIGINS|WEB_APP_URL|API_DOMAIN|COOKIE_DOMAIN)=' "$ENV_FILE"

COMPOSE=(docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml)
"${COMPOSE[@]}" up -d api caddy
"${COMPOSE[@]}" ps api
