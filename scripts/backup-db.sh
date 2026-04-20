#!/bin/bash
# Daily PostgreSQL backup to Cloudflare R2
#
# Prerequisites:
#   - aws CLI installed and configured with R2 credentials
#   - Environment variables: DB_NAME, R2_BUCKET, R2_ENDPOINT
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

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="backup-${DB_NAME}-${TIMESTAMP}.sql.gz"
TMPFILE="/tmp/${FILENAME}"

echo "[backup] Starting backup of ${DB_NAME} at ${TIMESTAMP}"

# Dump and compress
pg_dump "${DB_NAME}" | gzip > "${TMPFILE}"
SIZE=$(du -h "${TMPFILE}" | cut -f1)
echo "[backup] Dump complete: ${FILENAME} (${SIZE})"

# Upload to R2
aws s3 cp "${TMPFILE}" "s3://${R2_BUCKET}/${FILENAME}" \
  --endpoint-url "${R2_ENDPOINT}" \
  --no-progress
echo "[backup] Uploaded to R2: s3://${R2_BUCKET}/${FILENAME}"

# Clean up local temp file
rm -f "${TMPFILE}"

# Delete backups older than RETENTION_DAYS from R2
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
