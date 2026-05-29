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

STATE_DIR="${HEALTH_ALERT_STATE_DIR:-/tmp}"
MISSING_THRESHOLD="${HEALTH_ALERT_MISSING_THRESHOLD:-2}"
DOCKER_RETRIES="${HEALTH_ALERT_DOCKER_RETRIES:-3}"
DOCKER_RETRY_DELAY="${HEALTH_ALERT_DOCKER_RETRY_DELAY:-1}"

send_telegram() {
  if [ -n "$HEALTH_ALERT_TELEGRAM_LOG" ]; then
    {
      printf '%s\n' "$1"
      printf '%s\n' "---"
    } >> "$HEALTH_ALERT_TELEGRAM_LOG"
    return 0
  fi

  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=$1" \
    -d "parse_mode=HTML" > /dev/null 2>&1
}

docker_health_status() {
  CONTAINER="$1"
  ATTEMPT=1

  while [ "$ATTEMPT" -le "$DOCKER_RETRIES" ]; do
    STATUS=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$CONTAINER" 2>/dev/null)
    RC=$?
    if [ "$RC" -eq 0 ] && [ -n "$STATUS" ]; then
      printf '%s\n' "$STATUS"
      return 0
    fi

    ATTEMPT=$((ATTEMPT + 1))
    if [ "$ATTEMPT" -le "$DOCKER_RETRIES" ] && [ "$DOCKER_RETRY_DELAY" -gt 0 ]; then
      sleep "$DOCKER_RETRY_DELAY"
    fi
  done

  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -Fxq "$CONTAINER"; then
    printf '%s\n' "inspect-unavailable"
  else
    printf '%s\n' "missing"
  fi
}

site_health_status() {
  HEALTH_URL="$1"
  if [ -z "$HEALTH_URL" ]; then
    printf '%s\n' "unknown"
    return 0
  fi

  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    printf '%s\n' "ok"
  else
    printf '%s\n' "failed"
  fi
}

missing_streak() {
  COUNT_FILE="$1"
  if [ -f "$COUNT_FILE" ]; then
    COUNT=$(cat "$COUNT_FILE" 2>/dev/null)
  else
    COUNT=0
  fi
  case "$COUNT" in
    ''|*[!0-9]*) COUNT=0 ;;
  esac
  COUNT=$((COUNT + 1))
  printf '%s\n' "$COUNT" > "$COUNT_FILE"
  printf '%s\n' "$COUNT"
}

reset_missing_streak() {
  COUNT_FILE="$1"
  [ -f "$COUNT_FILE" ] && rm -f "$COUNT_FILE"
}

mkdir -p "$STATE_DIR"

# Format: container|display name|public health URL
SITES="
sanakenno-a|sanakenno.fi (a)|https://sanakenno.fi/api/health
sanakenno-b|sanakenno.fi (b)|https://sanakenno.fi/api/health
web_kontissa-web-1|erez.ac|
"

printf '%s\n' "$SITES" | while IFS='|' read -r CONTAINER SITE HEALTH_URL; do
  [ -z "$CONTAINER" ] && continue

  FLAG_FILE="${STATE_DIR}/${CONTAINER}-unhealthy.flag"
  COUNT_FILE="${STATE_DIR}/${CONTAINER}-missing.count"

  STATUS=$(docker_health_status "$CONTAINER")
  SITE_STATUS="unknown"

  if [ "$STATUS" != "healthy" ]; then
    if [ "$STATUS" = "missing" ] || [ "$STATUS" = "inspect-unavailable" ]; then
      STREAK=$(missing_streak "$COUNT_FILE")
      SITE_STATUS=$(site_health_status "$HEALTH_URL")

      if [ "$STATUS" = "inspect-unavailable" ] && [ "$SITE_STATUS" = "ok" ]; then
        continue
      fi

      if [ "$STREAK" -lt "$MISSING_THRESHOLD" ]; then
        continue
      fi
    else
      reset_missing_streak "$COUNT_FILE"
    fi

    if [ ! -f "$FLAG_FILE" ]; then
      send_telegram "⚠️ <b>${SITE} is down</b>
Status: <code>${STATUS}</code>
Site health: <code>${SITE_STATUS}</code>
Time: $(date '+%Y-%m-%d %H:%M')
Container: ${CONTAINER}"
      touch "$FLAG_FILE"
    fi
  else
    reset_missing_streak "$COUNT_FILE"
    if [ -f "$FLAG_FILE" ]; then
      DOWN_SINCE=$(stat -c %Y "$FLAG_FILE" 2>/dev/null || stat -f %m "$FLAG_FILE")
      DOWNTIME_MIN=$(( ($(date +%s) - DOWN_SINCE) / 60 ))
      send_telegram "✅ <b>${SITE} is back up</b>
Downtime: ~${DOWNTIME_MIN} minutes"
      rm -f "$FLAG_FILE"
    fi
  fi
done
