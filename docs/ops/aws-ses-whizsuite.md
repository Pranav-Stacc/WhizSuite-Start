# AWS SES (ap-south-1) for WhizSuite

Transactional email uses **Nodemailer → Amazon SES SMTP** in production. Verified domain: [whizsuite.com in SES (ap-south-1)](https://ap-south-1.console.aws.amazon.com/ses/home?region=ap-south-1#/identities/whizsuite.com).

Use AWS CLI profile **`whizsuite`** (`--profile whizsuite`).

## 1. Confirm identity status

```bash
aws sesv2 get-email-identity \
  --email-identity whizsuite.com \
  --region ap-south-1 \
  --profile whizsuite
```

## 2. Create SMTP credentials (IAM user for SMTP)

In SES console: **SMTP settings** → **Create SMTP credentials**, or use an IAM user with `ses:SendRawEmail` / SMTP secret.

Store username/password as `SMTP_USER` / `SMTP_PASS` (never commit).

## 3. API / deploy environment

```env
EMAIL_PROVIDER=ses-smtp
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<ses-smtp-username>
SMTP_PASS=<ses-smtp-password>
EMAIL_FROM=WhizSuite <noreply@whizsuite.com>
WEB_APP_URL=https://whizsuite.com
EMAIL_LOGO_URL=https://whizsuite.com/brand/logo-primary.png
NOTIFICATION_EMAIL_ENABLED=true
```

Local dev keeps Mailpit (`SMTP_HOST=localhost`, `SMTP_PORT=1025`).

## 4. Sandbox vs production

Check account mode:

```bash
aws sesv2 get-account --region ap-south-1 --profile whizsuite \
  --query '{production:ProductionAccessEnabled,quota:SendQuota}'
```

While **ProductionAccessEnabled** is `false`, SES only delivers to **verified identities**. Verify each test recipient:

```bash
aws sesv2 create-email-identity --email-identity you@gmail.com \
  --region ap-south-1 --profile whizsuite
```

The recipient must click the AWS verification email before sends succeed.

## 5. Test send (CLI)

Use `deploy/ses-test-email.json` (avoids Windows CLI quoting issues):

```bash
aws sesv2 send-email \
  --from-email-address "noreply@whizsuite.com" \
  --destination "ToAddresses=you@example.com" \
  --content file://deploy/ses-test-email.json \
  --region ap-south-1 \
  --profile whizsuite
```

## 6. Production server (EC2 via AWS CLI + SSM)

One-time SMTP IAM user (prints credentials locally — do not commit):

```bash
python deploy/ops-ses-provision.py
```

Push creds to `/opt/whizsuite/deploy/.env` and restart API (+ migrate):

```bash
# PowerShell
$env:SMTP_USER = "<from provision output>"
$env:SMTP_PASS = "<from provision output>"
$env:RUN_MIGRATE = "1"
python deploy/ops-ses-env.py
```

Test send from your machine:

```bash
python deploy/ops-ses-test.py you@example.com
```

Instance: `i-01b06d5c681c0907f` (`whizsuite-api`), profile **`whizsuite`**, region **`ap-south-1`**.

## 7. What sends email

| Flow | Trigger |
|------|---------|
| Team invite | `InvitationsService.invite` |
| Welcome + verify | `POST /api/v1/auth/register` |
| Password reset | `POST /api/v1/auth/forgot-password` |
| Email verify link | Registration (optional resend TBD) |
| In-app notifications | BullMQ `notifications.delivery` → email channel |
| Push | FCM (separate from SES) |

Branded HTML templates: `apps/api/src/shared/notifications/email-brand-template.ts`.

## 8. Run migration

```bash
cd apps/api
pnpm prisma migrate deploy
pnpm prisma generate
```

Adds `identity.auth_email_tokens` for reset/verify tokens.

## 9. Production checklist

- [ ] SES out of sandbox (or verified recipient list)
- [ ] DKIM + MAIL FROM aligned on `whizsuite.com`
- [ ] Remove Mailpit from prod compose; set SES env on API service
- [ ] SNS bounce/complaint topics (recommended)
- [ ] Rotate SMTP password via Secrets Manager
