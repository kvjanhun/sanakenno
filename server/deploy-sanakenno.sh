#!/bin/bash

cd /home/kvjanhun/Projects/sanakenno || exit 1

source /home/kvjanhun/.config/site-alerts.env

send_telegram() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=$1" \
    -d "parse_mode=HTML" > /dev/null 2>&1
}

fail() {
  send_telegram "❌ <b>Sanakenno deploy failed</b>
Stage: <code>$1</code>
Commit: <code>$(git log -1 --pretty=%h 2>/dev/null || echo unknown)</code> $(git log -1 --pretty=%s 2>/dev/null)
Time: $(date "+%Y-%m-%d %H:%M")"
  exit 1
}

export GIT_SSH_COMMAND="ssh -i /home/kvjanhun/.ssh/sanakenno_deploy_key -o IdentitiesOnly=yes"
echo "Pulling latest changes from GitHub..."
git pull origin main || fail "git pull"

echo "Rebuilding Docker container..."
docker compose up --build -d || fail "docker compose"

echo "Extracting frontend build to /var/www/sanakenno/dist..."
rm -rf /var/www/sanakenno/dist
docker cp sanakenno:/app/dist /var/www/sanakenno/dist || fail "docker cp dist"

COMMIT_MSG=$(git log -1 --pretty=%s)
COMMIT_HASH=$(git log -1 --pretty=%h)
send_telegram "🚀 <b>Sanakenno deployed</b>
<code>${COMMIT_HASH}</code> ${COMMIT_MSG}
Site: https://sanakenno.fi"

echo "Deploy complete."
