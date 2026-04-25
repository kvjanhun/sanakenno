#!/bin/bash

PROJECT_DIR="$HOME/Projects/sanakenno"
WEB_ROOT="/var/www/sanakenno"

cd "$PROJECT_DIR" || exit 1

source "$HOME/.config/site-alerts.env"

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

if [ "$1" != "--post-pull" ]; then
  export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/sanakenno_deploy_key -o IdentitiesOnly=yes"
  echo "Pulling latest changes from GitHub..."
  git stash
  git pull origin main || fail "git pull"
  git stash drop 2>/dev/null || true
  # Re-exec the freshly-pulled script so script-level changes (new flags,
  # new stages, retry logic) take effect on the same deploy that introduces
  # them, instead of one cycle late. Bash buffers small scripts at start, so
  # without this re-exec the post-pull commands keep running the cached
  # pre-pull version.
  exec "$0" --post-pull
  fail "exec self"
fi

echo "Rebuilding Docker container..."
# The single-container service was renamed to sanakenno-a / sanakenno-b in 1.5.0.
# Remove any leftover container with the old name so its port binding is released
# before compose tries to start the new services. --remove-orphans handles the
# common case where the legacy container was still managed by compose.
docker rm -f sanakenno 2>/dev/null || true
# --wait blocks until each service reports its compose healthcheck as healthy
# (or the timeout fires), so we don't race the Node startup with curl below.
docker compose up --build -d --remove-orphans --wait --wait-timeout 90 || fail "docker compose"

echo "Running post-deploy health checks..."
curl -fsS "http://127.0.0.1:8081/api/health" >/dev/null || fail "health 8081"
curl -fsS "http://127.0.0.1:8082/api/health" >/dev/null || fail "health 8082"
curl -fsS "https://sanakenno.fi/api/health" >/dev/null || fail "site health"

echo "Extracting frontend build to $WEB_ROOT/dist..."
rm -rf "$WEB_ROOT/dist"
docker cp sanakenno-a:/app/dist "$WEB_ROOT/dist" || fail "docker cp dist"

COMMIT_MSG=$(git log -1 --pretty=%s)
COMMIT_HASH=$(git log -1 --pretty=%h)
send_telegram "🚀 <b>Sanakenno deployed</b>
<code>${COMMIT_HASH}</code> ${COMMIT_MSG}
Site: https://sanakenno.fi"

echo "Deploy complete."
