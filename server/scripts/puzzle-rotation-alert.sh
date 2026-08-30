#!/bin/bash
# Alerts when Sanakenno is running out of fresh puzzles.
# Sends Telegram notifications at 7 days and 1 day remaining, and once more
# on the day the rotation restarts from the first puzzle.
#
# The API reports days_remaining directly: the number of fresh puzzle days
# left in the cycle, today included. 1 means today is the last fresh puzzle
# and the rotation restarts tomorrow. Deriving this here from puzzle numbers
# used to drift by a day for every soft-deleted puzzle in the rotation.
#
# Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment
# or in the ALERT_ENV_FILE (default: ~/.config/site-alerts.env).
#
# Install: daily cron at 09:00 Helsinki time
#   0 9 * * * /path/to/puzzle-rotation-alert.sh

ALERT_ENV_FILE="${ALERT_ENV_FILE:-$HOME/.config/site-alerts.env}"
[ -f "$ALERT_ENV_FILE" ] && source "$ALERT_ENV_FILE"

SANAKENNO_PORT="${SANAKENNO_PORT:-8081}"
HEALTH_URL="${HEALTH_URL:-http://localhost:${SANAKENNO_PORT}/api/health}"

send_telegram() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=$1" \
    -d "parse_mode=HTML" > /dev/null 2>&1
}

# Health also carries the rotation headroom. A failure here means the service
# is down, which the health monitor alerts about separately.
HEALTH=$(curl -sf "$HEALTH_URL" 2>/dev/null) || exit 0

DAYS_REMAINING=$(echo "$HEALTH" | jq -r '.days_remaining')
TOTAL=$(echo "$HEALTH" | jq -r '.total_puzzles')

# Both values feed numeric comparisons below, so bail on anything non-numeric
# rather than letting test(1) error out on a malformed payload.
case "$DAYS_REMAINING" in
  ''|null|*[!0-9]*) exit 0 ;;
esac
case "$TOTAL" in
  ''|null|*[!0-9]*) exit 0 ;;
esac

if [ "$DAYS_REMAINING" -eq 7 ]; then
  send_telegram "📅 <b>Sanakenno: 7 päivää jäljellä</b>
Kennoja yhteensä: ${TOTAL}
Kierto alkaa alusta viikon päästä."
elif [ "$DAYS_REMAINING" -eq 1 ]; then
  send_telegram "🚨 <b>Sanakenno: viimeinen uusi kenno!</b>
Kennoja yhteensä: ${TOTAL}
Kierto alkaa alusta huomenna. Lisää uusia kennoja!"
elif [ "$DAYS_REMAINING" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
  send_telegram "🔁 <b>Sanakenno: kierto alkoi alusta</b>
Kennoja yhteensä: ${TOTAL}
Pelaajat näkevät nyt jo kertaalleen pelattuja kennoja."
fi
