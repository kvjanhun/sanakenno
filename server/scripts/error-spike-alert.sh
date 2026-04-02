#!/bin/bash
# Monitors Sanakenno Docker logs for error spikes.
# Alerts via Telegram if error count exceeds threshold in the last 5 minutes.
#
# Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment
# or in the ALERT_ENV_FILE (default: ~/.config/site-alerts.env).
#
# Install: cron every 5 minutes
#   */5 * * * * /path/to/error-spike-alert.sh

ALERT_ENV_FILE="${ALERT_ENV_FILE:-$HOME/.config/site-alerts.env}"
[ -f "$ALERT_ENV_FILE" ] && source "$ALERT_ENV_FILE"

CONTAINER="sanakenno"
SITE="sanakenno.fi"
THRESHOLD=5
FLAG_FILE="/tmp/${CONTAINER}-error-spike.flag"
WINDOW="5m"

send_telegram() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=$1" \
    -d "parse_mode=HTML" > /dev/null 2>&1
}

# Count error-level log entries in the last 5 minutes
ERROR_COUNT=$(docker logs --since "$WINDOW" "$CONTAINER" 2>&1 | grep -c '"level":"error"')

if [ "$ERROR_COUNT" -ge "$THRESHOLD" ]; then
  if [ ! -f "$FLAG_FILE" ]; then
    # Get sample errors for context
    SAMPLE=$(docker logs --since "$WINDOW" "$CONTAINER" 2>&1 | grep '"level":"error"' | tail -3 | while read -r line; do
      MSG=$(echo "$line" | jq -r '.message // .error // "unknown"' 2>/dev/null)
      PATH_VAL=$(echo "$line" | jq -r '.path // ""' 2>/dev/null)
      echo "  • ${PATH_VAL}: ${MSG}"
    done)

    send_telegram "🔴 <b>${SITE} error spike</b>
Errors in last 5min: <code>${ERROR_COUNT}</code> (threshold: ${THRESHOLD})
Time: $(date '+%Y-%m-%d %H:%M')

Recent errors:
<pre>${SAMPLE}</pre>"
    touch "$FLAG_FILE"
  fi
else
  # Clear flag when errors drop below threshold
  rm -f "$FLAG_FILE"
fi
