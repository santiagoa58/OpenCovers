#!/usr/bin/env bash
# Run Drizzle migrations against Neon before routing traffic to a new API image.
# The runtime service account reads DATABASE_URL from Secret Manager.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID to the Google Cloud project ID}"
: "${IMAGE_TAG:?Set IMAGE_TAG to the image tag being deployed}"
REGION="${REGION:-us-east1}"
SERVICE="${SERVICE:-opencovers}"
ARTIFACT_REPO="${ARTIFACT_REPO:-opencovers}"
DB_SECRET="${DB_SECRET:-opencovers-database-url}"
SA_EMAIL="opencovers-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/api:${IMAGE_TAG}"
JOB="${SERVICE}-migrate"

# gcloud-wide flags come before container-scoped options.
gcloud run jobs deploy "$JOB" \
  --project="$PROJECT_ID" --region="$REGION" --quiet \
  --image="$API_IMAGE" --service-account="$SA_EMAIL" \
  --set-secrets="DATABASE_URL=${DB_SECRET}:latest" \
  --command=pnpm --args=db:migrate \
  --memory=512Mi --task-timeout=900s --max-retries=1

# --wait must fail the CI job if any migration fails. Never deploy in that case.
gcloud run jobs execute "$JOB" \
  --project="$PROJECT_ID" --region="$REGION" --wait
