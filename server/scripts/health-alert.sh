#!/bin/bash
# Combined health check for sanakenno.fi and erez.ac.
# Checks Docker container health status and sends Telegram alerts
# on state transitions (healthy -> unhealthy and back).
#
# Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment
# or in the ALERT_ENV_FILE (default: ~/.config/site-alerts.env).
#
# Install: cron every 5 minutes
#   */5 * * * * /path/to/health-alert.sh

ALERT_ENV_FILE="${ALERT_ENV_FILE:-$HOME/.config/site-alerts.env}"
[ -f "$ALERT_ENV_FILE" ] && source "$ALERT_ENV_FILE"

send_telegram() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=$1" \
    -d "parse_mode=HTML" > /dev/null 2>&1
}

# Container name -> display name
declare -A SITES=(
  ["sanakenno-a"]="sanakenno.fi (a)"
  ["sanakenno-b"]="sanakenno.fi (b)"
  ["web_kontissa-web-1"]="erez.ac"
)

for CONTAINER in "${!SITES[@]}"; do
  SITE="${SITES[$CONTAINER]}"
  FLAG_FILE="/tmp/${CONTAINER}-unhealthy.flag"

  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null)
  [ -z "$STATUS" ] && STATUS="missing"

  if [ "$STATUS" != "healthy" ]; then
    if [ ! -f "$FLAG_FILE" ]; then
      send_telegram "⚠️ <b>${SITE} is down</b>
Status: <code>${STATUS}</code>
Time: $(date '+%Y-%m-%d %H:%M')
Container: ${CONTAINER}"
      touch "$FLAG_FILE"
    fi
  else
    if [ -f "$FLAG_FILE" ]; then
      DOWN_SINCE=$(stat -c %Y "$FLAG_FILE" 2>/dev/null || stat -f %m "$FLAG_FILE")
      DOWNTIME_MIN=$(( ($(date +%s) - DOWN_SINCE) / 60 ))
      send_telegram "✅ <b>${SITE} is back up</b>
Downtime: ~${DOWNTIME_MIN} minutes"
      rm -f "$FLAG_FILE"
    fi
  fi
done
