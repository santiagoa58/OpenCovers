#!/usr/bin/env bash
# Deploy the two-container OpenCovers Cloud Run service.
#
# Cloud Shell (one-off): PROJECT_ID=... bash deploy/cloudrun/deploy.sh
# GitHub Actions: SKIP_BUILD=1 IMAGE_TAG=<commit-sha> PROJECT_ID=... bash deploy/cloudrun/deploy.sh
# PUBLIC_URL may be set to a verified HTTPS custom domain. Credentials stay in Secret Manager.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID to the Google Cloud project ID}"
REGION="${REGION:-us-east1}"
SERVICE="${SERVICE:-opencovers}"
ARTIFACT_REPO="${ARTIFACT_REPO:-opencovers}"
DB_SECRET="${DB_SECRET:-opencovers-database-url}"
AUTH_SECRET="opencovers-auth-secret"
BLOCKLIST_SECRET="opencovers-blocklist-key"
SA_NAME="opencovers-runtime"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SKIP_BUILD="${SKIP_BUILD:-0}"

command -v gcloud >/dev/null
[[ -f apps/api/Dockerfile && -f apps/web/Dockerfile ]] || {
  echo 'Run this from the root of the OpenCovers repository.' >&2
  exit 1
}

# CI uses prebuilt Artifact Registry images. It must not need administrative
# permissions to create service accounts, secrets, repositories or enable APIs.
if [[ "$SKIP_BUILD" != "1" ]]; then
  command -v git >/dev/null
  command -v openssl >/dev/null

  gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com \
    --project "$PROJECT_ID" --quiet

  if ! gcloud secrets describe "$DB_SECRET" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Missing Secret Manager secret: $DB_SECRET" >&2
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
fi

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short=12 HEAD)}"
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}"
API_IMAGE="${IMAGE_BASE}/api:${IMAGE_TAG}"
WEB_IMAGE="${IMAGE_BASE}/web:${IMAGE_TAG}"

if [[ "$SKIP_BUILD" != "1" ]]; then
  gcloud builds submit . --project "$PROJECT_ID" --region "$REGION" \
    --config=deploy/cloudrun/cloudbuild.yaml \
    --substitutions="_API_IMAGE=${API_IMAGE},_WEB_IMAGE=${WEB_IMAGE}" --quiet
fi

# On updates, reuse the existing service URL so no placeholder revision is
# needed. PUBLIC_URL selects the canonical custom HTTPS origin when mapped.
EXISTING_URL="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" \
  --format='value(status.url)' 2>/dev/null || true)"
APP_ORIGIN="${PUBLIC_URL:-${EXISTING_URL:-https://placeholder.invalid}}"
APP_ORIGIN="${APP_ORIGIN%/}"
case "$APP_ORIGIN" in
  https://*) ;;
  *) echo 'PUBLIC_URL must be an HTTPS origin, without a path.' >&2; exit 1 ;;
esac

# For a new service, keep registration closed until the real origin is known.
# Every deployment defaults to closed so CI cannot accidentally reopen signup.
SIGNUP="${SIGNUP:-closed}"
case "$SIGNUP" in
  first-user|closed) ;;
  *) echo 'SIGNUP must be closed or first-user.' >&2; exit 1 ;;
esac

# IMPORTANT: all gcloud-wide and service flags (including --quiet) must occur
# BEFORE --container. Everything after --container is container-scoped.
gcloud run deploy "$SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" --platform=managed \
  --execution-environment=gen2 --min-instances=0 --max-instances=1 \
  --cpu-throttling --concurrency=20 --timeout=120 \
  --service-account="$SA_EMAIL" --allow-unauthenticated --quiet \
  --container=web --image="$WEB_IMAGE" --port=8080 --memory=256Mi \
  --set-env-vars='SITE_ADDRESS=:8080,API_UPSTREAM=localhost:3000' \
  --container=api --image="$API_IMAGE" --memory=512Mi \
  --set-secrets="DATABASE_URL=${DB_SECRET}:latest,BETTER_AUTH_SECRET=${AUTH_SECRET}:latest,BLOCKLIST_KEY=${BLOCKLIST_SECRET}:latest" \
  --set-env-vars="SIGNUP=${SIGNUP},TRUST_PROXY=true,RATE_LIMIT=on,BETTER_AUTH_URL=${APP_ORIGIN},TRUSTED_ORIGINS=${APP_ORIGIN}"

APP_URL="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" --region "$REGION" \
  --format='value(status.url)')"
[[ "$APP_URL" == https://* ]] || {
  echo 'Cloud Run did not return an HTTPS service URL.' >&2
  exit 1
}

# First deployment has no run.app URL until Cloud Run has created the service.
if [[ "$APP_ORIGIN" == "https://placeholder.invalid" ]]; then
  APP_ORIGIN="$APP_URL"
  gcloud run services update "$SERVICE" \
    --project "$PROJECT_ID" --region "$REGION" --quiet --container=api \
    --update-env-vars="BETTER_AUTH_URL=${APP_ORIGIN},TRUSTED_ORIGINS=${APP_ORIGIN},SIGNUP=${SIGNUP}"
fi

printf '\nImage tag: %s\nService URL: %s\nCanonical origin: %s\nHealth: %s/health\nSignup: %s\n' \
  "$IMAGE_TAG" "$APP_URL" "$APP_ORIGIN" "$APP_URL" "$SIGNUP"
