#!/usr/bin/env bash
# Deploy OpenCovers from this fork, invoked by an authorized Google Cloud agent.
# Non-interactive; no secrets are stored in GitHub or printed to logs.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID to the approved Google Cloud project ID}"
REGION="${REGION:-us-east1}"
SERVICE="${SERVICE:-opencovers}"
ARTIFACT_REPO="${ARTIFACT_REPO:-opencovers}"
DB_SECRET="${DB_SECRET:-opencovers-database-url}"
AUTH_SECRET=opencovers-auth-secret
BLOCKLIST_SECRET=opencovers-blocklist-key
SA_NAME=opencovers-runtime
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

command -v gcloud >/dev/null
command -v git >/dev/null
command -v openssl >/dev/null
[[ -f apps/api/Dockerfile && -f apps/web/Dockerfile ]] || {
  echo 'Run this from the root of the santiagoa58/OpenCovers fork.' >&2
  exit 1
}

gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com \
  --project "$PROJECT_ID" --quiet

# Gemini must create this Google Secret Manager secret first, using the
# existing Neon project divine-recipe-34435247 and database opencovers.
if ! gcloud secrets describe "$DB_SECRET" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Missing Google Secret Manager secret: $DB_SECRET" >&2
  exit 1
fi

if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" \
  --project "$PROJECT_ID" --location "$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --project "$PROJECT_ID" --location "$REGION" \
    --repository-format=docker --description='OpenCovers container images' --quiet
fi

create_random_secret() {
  local name="$1"
  if ! gcloud secrets describe "$name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    openssl rand -hex 32 | tr -d '\n' | gcloud secrets create "$name" \
      --project "$PROJECT_ID" --replication-policy=automatic \
      --data-file=- --quiet >/dev/null
  fi
}
create_random_secret "$AUTH_SECRET"
create_random_secret "$BLOCKLIST_SECRET"

if ! gcloud iam service-accounts describe "$SA_EMAIL" \
  --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" \
    --project "$PROJECT_ID" --display-name='OpenCovers runtime' --quiet
fi
for secret in "$DB_SECRET" "$AUTH_SECRET" "$BLOCKLIST_SECRET"; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --project "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role='roles/secretmanager.secretAccessor' --quiet >/dev/null
done

SOURCE_SHA="$(git rev-parse --short=12 HEAD)"
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}"
API_IMAGE="${IMAGE_BASE}/api:${SOURCE_SHA}"
WEB_IMAGE="${IMAGE_BASE}/web:${SOURCE_SHA}"

gcloud builds submit . --project "$PROJECT_ID" --region "$REGION" \
  --config=deploy/cloudrun/cloudbuild.yaml \
  --substitutions="_API_IMAGE=${API_IMAGE},_WEB_IMAGE=${WEB_IMAGE}" --quiet

# The unmodified Hono API uses localhost:3000 (sidecar).
# Caddy exposes port 8080 and proxies /api, /v1 and /health to the API.
# Temporarily close signup until Better Auth has the correct HTTPS origin.
gcloud run deploy "$SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" --platform=managed \
  --execution-environment=gen2 --min-instances=0 --max-instances=1 \
  --cpu-throttling --concurrency=20 --timeout=120 \
  --service-account="$SA_EMAIL" --allow-unauthenticated \
  --container=api --image="$API_IMAGE" --memory=512Mi \
  --set-secrets="DATABASE_URL=${DB_SECRET}:latest,BETTER_AUTH_SECRET=${AUTH_SECRET}:latest,BLOCKLIST_KEY=${BLOCKLIST_SECRET}:latest" \
  --set-env-vars='SIGNUP=closed,TRUST_PROXY=true,RATE_LIMIT=on,BETTER_AUTH_URL=https://placeholder.invalid,TRUSTED_ORIGINS=https://placeholder.invalid' \
  --container=web --image="$WEB_IMAGE" --port=8080 --memory=256Mi \
  --set-env-vars='SITE_ADDRESS=:8080,API_UPSTREAM=localhost:3000' \
  --quiet

APP_URL="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" \
  --format='value(status.url)')"
[[ "$APP_URL" == https://* ]] || {
  echo 'Cloud Run did not return an HTTPS service URL.' >&2
  exit 1
}

# Permit only the first account until the administrator is registered.
gcloud run services update "$SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" --container=api \
  --update-env-vars="BETTER_AUTH_URL=${APP_URL},TRUSTED_ORIGINS=${APP_URL},SIGNUP=first-user" --quiet

printf '\nSource SHA: %s\nHTTPS URL: %s\nHealth: %s/health\n' \
  "$SOURCE_SHA" "$APP_URL" "$APP_URL"
printf '%s\n' 'Have the owner register the first account promptly, then set SIGNUP=closed.'
