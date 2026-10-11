# WhizSuite — Google Drive / Calendar GCP setup (gcloud).
# Run from repo root:  powershell -File scripts/gcloud-google-integrations.ps1

$ErrorActionPreference = "Stop"
$ProjectId = "whizsuite-759b0"
$ProjectNumber = "9465040813"
$WebClientId = "9465040813-c2o7a0t2b86tqnareuods7evo5ge355v.apps.googleusercontent.com"

Write-Host "Setting gcloud project to $ProjectId ..."
gcloud config set project $ProjectId | Out-Null

Write-Host "Enabling Google Drive API and Google Calendar API ..."
gcloud services enable drive.googleapis.com calendar-json.googleapis.com --project=$ProjectId

Write-Host ""
Write-Host "Enabled APIs:"
gcloud services list --enabled --project=$ProjectId `
  --filter="config.name:drive.googleapis.com OR config.name:calendar-json.googleapis.com" `
  --format="table(config.name)"

$redirects = @(
  "http://localhost:4000/api/v1/integrations/google-drive/callback"
  "http://localhost:4000/api/v1/integrations/google-calendar/callback"
  "https://api.whizsuite.praanav.in/api/v1/integrations/google-drive/callback"
  "https://api.whizsuite.praanav.in/api/v1/integrations/google-calendar/callback"
)

Write-Host ""
Write-Host "=== Manual step (gcloud cannot edit Firebase Web OAuth redirect URIs) ==="
Write-Host "Open the Web OAuth client in Google Cloud Console and add these Authorized redirect URIs:"
foreach ($r in $redirects) { Write-Host "  - $r" }
$consoleUrl = "https://console.cloud.google.com/auth/clients/${WebClientId}?project=${ProjectId}"
Write-Host ""
Write-Host "Console link:"
Write-Host $consoleUrl

Write-Host ""
Write-Host "=== API env (production) ==="
Write-Host "Copy the Web client secret from the console, then run:"
Write-Host '  $env:GOOGLE_DRIVE_CLIENT_SECRET="<secret>"'
Write-Host "  python deploy/ops-google-oauth-env.py"
Write-Host ""
Write-Host "=== API env (local apps/api/.env) ==="
Write-Host "GOOGLE_DRIVE_CLIENT_ID=$WebClientId"
Write-Host "GOOGLE_DRIVE_CLIENT_SECRET=<from console>"
Write-Host "GOOGLE_DRIVE_REDIRECT_URI=http://localhost:4000/api/v1/integrations/google-drive/callback"
Write-Host "GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:4000/api/v1/integrations/google-calendar/callback"
Write-Host "WEB_APP_URL=http://localhost:3000"
