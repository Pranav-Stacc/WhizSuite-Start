# Migrate from `Pranav-stac/WhizSuite-Start` to `Pranav-Stacc/WhizSuite-Start`

The **Pranav-stac** repo (private) holds GitHub Actions secrets for Play Store, App Store, and Match.
The **Pranav-Stacc** repo is the new canonical remote; code already pushes there.

GitHub **cannot export secret values** via the API. Copy them with the one-time workflow below.

## 1. Production environment variables (AWS deploy)

These are **not secret** — already on the new repo except Amplify:

| Variable | Value |
|----------|--------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::508193318963:role/whizsuite-github-deploy` |
| `AWS_REGION` | `ap-south-1` |
| `ECR_REPOSITORY` | `whizsuite-api` |
| `EC2_INSTANCE_ID` | `i-01b06d5c681c0907f` |
| `EC2_APP_DIR` | `/opt/whizsuite` |
| `AMPLIFY_APP_ID` | `d2o8v8clrzpf9d` |
| `AMPLIFY_BRANCH` | `main` |

Set missing Amplify vars on **Pranav-Stacc/WhizSuite-Start** → Settings → Environments → **production** → Variables.

## 2. Copy mobile / signing secrets (one-time)

1. On **Pranav-Stacc**, create a fine-grained PAT with **Secrets** read/write on `WhizSuite-Start`.
2. On **Pranav-stac/WhizSuite-Start**, add repo secret `DEST_REPO_PAT` = that PAT.
3. Add workflow from `deploy/github/migrate-secrets-to-pranav-stacc.yml` to the old repo at  
   `.github/workflows/migrate-secrets-to-pranav-stacc.yml` (web UI or push).
4. **Actions** → **Migrate secrets to Pranav-Stacc** → Run → confirm `MIGRATE`.
5. Verify: `gh secret list -R Pranav-Stacc/WhizSuite-Start` (17 names).
6. Remove the migrate workflow and `DEST_REPO_PAT` from the old repo.

## 3. AWS OIDC

IAM role trust already allows `Pranav-Stacc/WhizSuite-Start` environment `production` (`deploy/tmp-trust-policy.json`).

## 4. Amplify (web)

1. AWS Amplify Console → app **d2o8v8clrzpf9d**.
2. **Hosting** → connect repository → **Pranav-Stacc/WhizSuite-Start**, branch `main`, app root `apps/web`.
3. Copy environment variables from the old Amplify app (or `apps/web/.env.example` + production values).
4. Ensure `APP_DATA_MODE=live`, `API_BASE_URL`, `SESSION_*`, `NEXT_PUBLIC_*` match production.
5. Trigger a build; confirm `https://whizsuite.com` login.

## 5. EC2 deploy checkout

Production server should pull **Pranav-Stacc**:

```bash
cd /opt/whizsuite && git remote -v
# origin → https://github.com/Pranav-Stacc/WhizSuite-Start.git
```

CI `deploy-api` uses SSM + `deploy/deploy.sh`; deploy key must have read access to **Pranav-Stacc** repo.

## 6. Test CI on new repo

```bash
gh workflow run ci-cd.yml -R Pranav-Stacc/WhizSuite-Start -f force_api=true
gh workflow run publish-android-play.yml -R Pranav-Stacc/WhizSuite-Start
gh workflow run publish-ios-app-store.yml -R Pranav-Stacc/WhizSuite-Start
```

## 7. Retire old repo

After secrets are copied, Amplify points at Pranav-Stacc, and a green `deploy-api` + optional mobile publish:

1. Archive or delete **Pranav-stac/WhizSuite-Start** (Settings → Danger zone).
2. Revoke `DEST_REPO_PAT` and any deploy keys only used for the old remote.

Do **not** delete the old repo until Play/iOS secrets are verified on Pranav-Stacc.
