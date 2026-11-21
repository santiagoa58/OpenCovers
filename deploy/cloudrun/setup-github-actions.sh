#!/usr/bin/env bash
# One-time Google Cloud bootstrap for GitHub Actions.
# Uses short-lived GitHub OIDC tokens, never exported service-account keys.
# Run in Cloud Shell as a project IAM administrator.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID to the Google Cloud project ID}"
REGION="${REGION:-us-east1}"
ARTIFACT_REPO="${ARTIFACT_REPO:-opencovers}"
GITHUB_REPO="santiagoa58/OpenCovers"
POOL_ID="opencovers-github"
PROVIDER_ID="github"
DEPLOYER_NAME="opencovers-deployer"
DEPLOYER_EMAIL="${DEPLOYER_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_EMAIL="opencovers-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud services enable iam.googleapis.com iamcredentials.googleapis.com \
  sts.googleapis.com run.googleapis.com artifactregistry.googleapis.com \
  --project "$PROJECT_ID" --quiet

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
[[ -n "$PROJECT_NUMBER" ]] || { echo 'Cannot determine project number.' >&2; exit 1; }

# New identities can take a short time to become visible to IAM.
retry_binding() {
  local attempt
  for attempt in 1 2 3 4 5 6; do
    if "$@"; then return 0; fi
    if [[ "$attempt" == "6" ]]; then
      echo 'IAM binding failed after retries. Check the preceding permission error.' >&2
      return 1
    fi
    echo "IAM not ready yet; retrying ($attempt/6)..." >&2
    sleep 10
  done
}

if ! gcloud iam service-accounts describe "$DEPLOYER_EMAIL" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DEPLOYER_NAME" \
    --project="$PROJECT_ID" --display-name='OpenCovers GitHub deployer' --quiet
fi

if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
  --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location=global --project="$PROJECT_ID" \
    --display-name='OpenCovers GitHub Actions' --quiet
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --workload-identity-pool="$POOL_ID" --location=global \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" \
    --display-name='OpenCovers main branch' \
    --issuer-uri='https://token.actions.githubusercontent.com' \
    --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository' \
    --attribute-condition="assertion.repository == '${GITHUB_REPO}' && assertion.ref == 'refs/heads/main'" \
    --quiet
fi

# Only workflows from this specific repo, as restricted by the provider to main,
# may impersonate this dedicated deployment identity.
PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
retry_binding gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_EMAIL" \
  --project="$PROJECT_ID" --member="$PRINCIPAL" \
  --role='roles/iam.workloadIdentityUser' --quiet >/dev/null

# Deploy the Cloud Run service; permit using its existing runtime identity.
retry_binding gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" \
  --role='roles/run.admin' --quiet >/dev/null
retry_binding gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_EMAIL" \
  --project="$PROJECT_ID" --member="serviceAccount:${DEPLOYER_EMAIL}" \
  --role='roles/iam.serviceAccountUser' --quiet >/dev/null

# The deployer can push images to this repo, not every Artifact Registry repo.
retry_binding gcloud artifacts repositories add-iam-policy-binding "$ARTIFACT_REPO" \
  --project="$PROJECT_ID" --location="$REGION" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" \
  --role='roles/artifactregistry.writer' --quiet >/dev/null

printf '\nGoogle Cloud trust configured.\n'
printf 'Workload Identity Provider: projects/%s/locations/global/workloadIdentityPools/%s/providers/%s\n' \
  "$PROJECT_NUMBER" "$POOL_ID" "$PROVIDER_ID"
printf 'Deployment service account: %s\n' "$DEPLOYER_EMAIL"
printf '\nIn GitHub > santiagoa58/OpenCovers > Settings > Secrets and variables > Actions > Variables,\n'
printf 'create the repository variable OPENCOVERS_CLOUD_RUN_ENABLED with value true.\n'
printf 'Then run the ci workflow using Actions > ci > Run workflow on main.\n'
printf 'Optional: after mapping the custom domain, create OPENCOVERS_PUBLIC_URL=https://opencovers.santimade.dev\n'
