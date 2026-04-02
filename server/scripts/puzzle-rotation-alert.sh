#!/bin/bash
# Alerts when Sanakenno puzzle rotation is about to restart from #1.
# Sends Telegram notification at 7 days and 1 day remaining.
#
# Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment
# or in the ALERT_ENV_FILE (default: ~/.config/site-alerts.env).
#
# Install: daily cron at 09:00 Helsinki time
#   0 9 * * * /path/to/puzzle-rotation-alert.sh

ALERT_ENV_FILE="${ALERT_ENV_FILE:-$HOME/.config/site-alerts.env}"
[ -f "$ALERT_ENV_FILE" ] && source "$ALERT_ENV_FILE"

SANAKENNO_PORT="${SANAKENNO_PORT:-8081}"
HEALTH_URL="http://localhost:${SANAKENNO_PORT}/api/health"
PUZZLE_URL="http://localhost:${SANAKENNO_PORT}/api/puzzle"

send_telegram() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=$1" \
    -d "parse_mode=HTML" > /dev/null 2>&1
}

# Check that the service is up first
HEALTH=$(curl -sf "$HEALTH_URL" 2>/dev/null)
if [ $? -ne 0 ]; then
  # Health check will handle alerting about downtime
  exit 0
fi

# Get today's puzzle data
RESPONSE=$(curl -sf "$PUZZLE_URL" 2>/dev/null)
if [ $? -ne 0 ]; then
  exit 0
fi

TOTAL=$(echo "$RESPONSE" | jq -r '.total_puzzles')
CURRENT=$(echo "$RESPONSE" | jq -r '.puzzle_number')

if [ -z "$TOTAL" ] || [ "$TOTAL" = "null" ] || [ -z "$CURRENT" ] || [ "$CURRENT" = "null" ]; then
  exit 0
fi

# current slot = (START_INDEX + days_since_epoch) % TOTAL  (START_INDEX=1)
# days_until_wrap = TOTAL - (CURRENT - 1 + TOTAL) % TOTAL
DAYS_INTO_CYCLE=$(( (CURRENT - 1 + TOTAL) % TOTAL ))
DAYS_REMAINING=$(( TOTAL - DAYS_INTO_CYCLE ))

if [ "$DAYS_REMAINING" -eq 7 ]; then
  send_telegram "📅 <b>Sanakenno: 7 päivää jäljellä</b>
Kennoja yhteensä: ${TOTAL}
Nykyinen: #$((CURRENT + 1))
Kierto alkaa alusta viikon päästä."
elif [ "$DAYS_REMAINING" -eq 1 ]; then
  send_telegram "🚨 <b>Sanakenno: viimeinen kenno!</b>
Kennoja yhteensä: ${TOTAL}
Nykyinen: #$((CURRENT + 1))
Kierto alkaa alusta huomenna. Lisää uusia kennoja!"
fi
