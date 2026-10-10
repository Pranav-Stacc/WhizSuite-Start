# ADR 0001: Initial AWS deployment topology

- Status: Accepted
- Date: 2026-10-05

## Context

The product needs a low-cost production environment for the modular monolith (`apps/api`), its
PostgreSQL and Redis dependencies, and the Next.js frontend (`apps/web`), with automated CI/CD.
Traffic is early-stage; cost matters more than horizontal scale.

## Decision

- **API, agent, PostgreSQL, Redis** run as Docker Compose services on a single EC2 `t3.medium`
  (2 vCPU / 4 GiB) with a 60 GB gp3 root volume (`deploy/docker-compose.prod.yml`), fronted by
  Caddy for automatic TLS. (Originally `t3.micro` / 20 GB; disk expanded and instance upsized
  2026-10-10 after deploy OOM and disk-full failures.)
- **API image** is built once in GitHub Actions and pushed to ECR, tagged with the commit SHA.
  The instance never builds code; it only pulls images.
- **Deploys** use GitHub OIDC to assume a narrowly scoped IAM role (no long-lived AWS keys), then
  AWS Systems Manager Run Command executes `deploy/deploy.sh` on the instance. The instance pulls
  repository files over SSH with a read-only GitHub deploy key.
- **Migrations and seed** run as a one-off `migrate` container in the deploy step, never at app boot.
- **Frontend** is hosted on AWS Amplify (Next.js SSR). Branch auto-build is disabled; the pipeline
  triggers Amplify only after CI passes and the API deploy succeeds.
- **Media storage** uses S3 via the EC2 instance role; static storage keys remain supported for
  local MinIO.
- **Secrets** for the API live only in `deploy/.env` on the instance (mode 600, generated there).
  Frontend server secrets are Amplify environment variables.

## Consequences

- Single instance is a single point of failure; database backups must be added (EBS snapshots via
  AWS Backup or `pg_dump` to S3) before real customer data.
- Moving to RDS / ElastiCache / ECS later only changes `deploy/` and environment values; the app
  already reads every endpoint from configuration.
- Production hosts: web `https://whizsuite.com` (and `www`), API `https://api.whizsuite.com`.
  Keep `CORS_ORIGINS`, `WEB_APP_URL`, `API_DOMAIN`, `COOKIE_DOMAIN` in `deploy/.env` and
  `API_BASE_URL` in Amplify aligned with those hosts.
- Amplify Hosting officially documents Next.js up to 15; Next.js streaming is not supported there.
