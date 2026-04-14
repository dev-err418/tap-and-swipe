#!/usr/bin/env bash
#
# Cron script: fetch latest app store data, commit & push.
# Designed to run on the hosting server (Linux).
#
# Setup:
#   1. Ensure git, node (v20+), and npm are available
#   2. Configure git credentials (SSH key or token) for push access
#   3. Add to crontab:
#      0 4 */3 * *  /path/to/scripts/cron-update-app-data.sh >> /var/log/update-app-data.log 2>&1
#
set -euo pipefail

REPO_URL="https://github.com/dev-err418/tap-and-swipe.git"
BRANCH="main"
WORK_DIR="/tmp/tap-and-swipe-app-data"

echo "=== $(date -u '+%Y-%m-%d %H:%M:%S UTC') Starting app data update ==="

# Clean slate
rm -rf "$WORK_DIR"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$WORK_DIR"
cd "$WORK_DIR"

# Install deps (--ignore-scripts skips prisma generate which needs DATABASE_URL)
npm ci --ignore-scripts
npx tsx scripts/update-app-data.ts

# Check if anything changed
if git diff --quiet && git diff --cached --quiet; then
  echo "No changes detected, skipping commit."
  rm -rf "$WORK_DIR"
  exit 0
fi

# Commit and push
git config user.name "app-data-bot"
git config user.email "bot@tap-and-swipe.com"
git add content/app-data/ public/apps/
git commit -m "chore: update app store data"
git push origin "$BRANCH"

echo "=== Done ==="

# Cleanup
rm -rf "$WORK_DIR"
