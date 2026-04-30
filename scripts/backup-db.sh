#!/bin/bash
# Daily PostgreSQL backup to Cloudflare R2
#
# Prerequisites:
#   - aws CLI installed and configured with R2 credentials
#   - Environment variables: DB_NAME, R2_BUCKET, R2_ENDPOINT
#   - Optional: DISCORD_WEBHOOK_URL (alerts on failure)
#
# Coolify cron: 0 3 * * * /path/to/backup-db.sh
#
# R2 credentials (set in environment or ~/.aws/credentials):
#   AWS_ACCESS_KEY_ID=<R2 access key>
#   AWS_SECRET_ACCESS_KEY=<R2 secret key>

set -euo pipefail

DB_NAME="${DB_NAME:-tap_and_swipe}"
R2_BUCKET="${R2_BUCKET:-tap-and-swipe-backups}"
R2_ENDPOINT="${R2_ENDPOINT:-https://<account-id>.r2.cloudflarestorage.com}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="backup-${DB_NAME}-${TIMESTAMP}.sql.gz"
TMPFILE="/tmp/${FILENAME}"
VERIFYFILE="/tmp/verify-${FILENAME}"

notify_failure() {
  local stage="$1"
  local detail="${2:-}"
  echo "[backup] FAILURE at stage: ${stage}. ${detail}" >&2

  if [[ -z "${DISCORD_WEBHOOK_URL}" ]]; then
    return
  fi

  # Discord webhook payload (red embed, color 0xED4245)
  local payload
  payload=$(cat <<JSON
{
  "embeds": [
    {
      "title": "Database backup failed",
      "description": "Daily backup did not complete successfully. Investigate before tomorrow's run.",
      "color": 15548997,
      "fields": [
        {"name": "Database", "value": "${DB_NAME}", "inline": true},
        {"name": "Stage", "value": "${stage}", "inline": true},
        {"name": "Timestamp", "value": "${TIMESTAMP}", "inline": false},
        {"name": "Detail", "value": "${detail:-(none)}", "inline": false}
      ]
    }
  ]
}
JSON
)

  curl -fsS -X POST "${DISCORD_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "${payload}" >/dev/null 2>&1 || true
}

cleanup() {
  rm -f "${TMPFILE}" "${VERIFYFILE}"
}
trap cleanup EXIT

# Tag the failing stage so the alert is actionable.
STAGE="init"
trap 'notify_failure "${STAGE}" "exit code $?"' ERR

echo "[backup] Starting backup of ${DB_NAME} at ${TIMESTAMP}"

STAGE="pg_dump"
pg_dump "${DB_NAME}" | gzip > "${TMPFILE}"
SIZE=$(du -h "${TMPFILE}" | cut -f1)
SIZE_BYTES=$(wc -c < "${TMPFILE}" | tr -d ' ')
echo "[backup] Dump complete: ${FILENAME} (${SIZE})"

STAGE="upload"
aws s3 cp "${TMPFILE}" "s3://${R2_BUCKET}/${FILENAME}" \
  --endpoint-url "${R2_ENDPOINT}" \
  --no-progress
echo "[backup] Uploaded to R2: s3://${R2_BUCKET}/${FILENAME}"

# Verify by downloading the uploaded copy and testing the gzip integrity.
STAGE="verify-download"
aws s3 cp "s3://${R2_BUCKET}/${FILENAME}" "${VERIFYFILE}" \
  --endpoint-url "${R2_ENDPOINT}" \
  --no-progress

STAGE="verify-size"
VERIFY_BYTES=$(wc -c < "${VERIFYFILE}" | tr -d ' ')
if [[ "${VERIFY_BYTES}" != "${SIZE_BYTES}" ]]; then
  notify_failure "verify-size" "local=${SIZE_BYTES} bytes, remote=${VERIFY_BYTES} bytes"
  exit 1
fi

STAGE="verify-gunzip"
if ! gunzip -t "${VERIFYFILE}" 2>/dev/null; then
  notify_failure "verify-gunzip" "gzip integrity check failed on downloaded copy"
  exit 1
fi
echo "[backup] Verified: ${SIZE_BYTES} bytes, gzip integrity OK"

# Delete backups older than RETENTION_DAYS from R2
STAGE="prune"
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)
echo "[backup] Cleaning backups older than ${CUTOFF_DATE}..."

aws s3 ls "s3://${R2_BUCKET}/backup-${DB_NAME}-" \
  --endpoint-url "${R2_ENDPOINT}" 2>/dev/null | while read -r line; do
  FILE_DATE=$(echo "${line}" | awk '{print $NF}' | sed "s/backup-${DB_NAME}-//" | cut -d'_' -f1)
  if [[ "${FILE_DATE}" < "${CUTOFF_DATE}" ]]; then
    FILE_NAME=$(echo "${line}" | awk '{print $NF}')
    aws s3 rm "s3://${R2_BUCKET}/${FILE_NAME}" --endpoint-url "${R2_ENDPOINT}" --no-progress
    echo "[backup] Deleted old backup: ${FILE_NAME}"
  fi
done

echo "[backup] Done."
