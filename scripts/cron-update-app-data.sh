#!/usr/bin/env bash
#
# Cron script: fetch latest app store data, commit & push.
# Sends a Discord notification with results.
#
# Setup:
#   1. Ensure git, node (v20+), and npm are available
#   2. Configure git credentials (SSH key or token) for push access
#   3. Set APP_DATA_DISCORD_WEBHOOK_URL in env (or .env on server)
#   4. Add to crontab:
#      0 4 */3 * *  /path/to/scripts/cron-update-app-data.sh >> /var/log/update-app-data.log 2>&1
#
set -euo pipefail

REPO_URL="https://github.com/dev-err418/tap-and-swipe.git"
BRANCH="main"
WORK_DIR="/tmp/tap-and-swipe-app-data"
WEBHOOK_URL="${APP_DATA_DISCORD_WEBHOOK_URL:-}"

echo "=== $(date -u '+%Y-%m-%d %H:%M:%S UTC') Starting app data update ==="

send_discord() {
  local title="$1"
  local description="$2"
  local color="$3"

  if [ -z "$WEBHOOK_URL" ]; then
    echo "No webhook URL set, skipping Discord notification"
    return
  fi

  curl -sf -o /dev/null -H "Content-Type: application/json" -d "{
    \"embeds\": [{
      \"title\": \"$title\",
      \"description\": \"$description\",
      \"color\": $color,
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }]
  }" "$WEBHOOK_URL" || echo "Warning: Discord notification failed"
}

# Clean slate
rm -rf "$WORK_DIR"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$WORK_DIR" || {
  send_discord "App Data Update Failed" "git clone failed" 15548997
  exit 1
}
cd "$WORK_DIR"

# Install deps (--ignore-scripts skips prisma generate which needs DATABASE_URL)
npm ci --ignore-scripts

# Run the update script and capture output
OUTPUT=$(npx tsx scripts/update-app-data.ts 2>&1) || {
  send_discord "App Data Update Failed" "Script crashed. Check server logs." 15548997
  echo "$OUTPUT"
  rm -rf "$WORK_DIR"
  exit 1
}

echo "$OUTPUT"

# Count results from script output
TOTAL=$(echo "$OUTPUT" | grep -c "^── " || true)
SUCCESSES=$(echo "$OUTPUT" | grep -c "✓ Wrote" || true)
FAILURES=$((TOTAL - SUCCESSES))

# Check if anything changed
CHANGED=$(git status --porcelain content/app-data/ public/apps/ | wc -l | tr -d ' ')

if [ "$CHANGED" -eq 0 ]; then
  echo "No changes detected, skipping commit."
  send_discord "App Data Update" "No changes. $SUCCESSES/$TOTAL apps fetched successfully." 5763719
  rm -rf "$WORK_DIR"
  exit 0
fi

# Commit and push
git config user.name "app-data-bot"
git config user.email "bot@tap-and-swipe.com"
git add content/app-data/ public/apps/
git commit -m "chore: update app store data ($CHANGED file(s) changed)"
git push origin "$BRANCH" || {
  send_discord "App Data Update Failed" "git push failed. $SUCCESSES/$TOTAL fetched, $CHANGED file(s) changed." 15548997
  rm -rf "$WORK_DIR"
  exit 1
}

send_discord "App Data Updated" "$CHANGED file(s) updated. $SUCCESSES/$TOTAL apps fetched successfully." 5763719

echo "=== Done ==="

# Cleanup
rm -rf "$WORK_DIR"
