#!/bin/bash
# Alerts when Sanakenno puzzle rotation is about to restart from #1.
# Sends Telegram notification at 7 days and 1 day remaining.
#
# Install: daily cron at 09:00 Helsinki time
#   0 9 * * * /home/kvjanhun/scripts/puzzle-rotation-alert.sh

source /home/kvjanhun/.config/site-alerts.env

HEALTH_URL="http://localhost:8081/api/health"
PUZZLE_URL="http://localhost:8081/api/puzzle"

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

# Puzzle numbers are 0-indexed. The rotation cycles through 0..TOTAL-1.
# Days until wrap = how many unique puzzles remain before we've seen all TOTAL.
# Since puzzles advance by 1 each day, days remaining = TOTAL - days_since_slot_0_was_last_seen.
# Simpler: the rotation restarts after TOTAL days from epoch. We need days until
# the current cycle completes.
#
# current slot = (START_INDEX + days_since_epoch) % TOTAL
# We want: days_until = TOTAL - (days_since_epoch % TOTAL)
# But we don't have days_since_epoch directly. We can compute it from CURRENT:
#   CURRENT = (1 + days_since_epoch) % TOTAL  (START_INDEX=1)
#   days_since_epoch % TOTAL = (CURRENT - 1 + TOTAL) % TOTAL
#   days_until_wrap = TOTAL - (CURRENT - 1 + TOTAL) % TOTAL
# When CURRENT=0, that gives TOTAL - (TOTAL-1) = 1 (last puzzle before wrap)
# When CURRENT=1, that gives TOTAL - 0 = TOTAL (just wrapped, full cycle ahead)

DAYS_INTO_CYCLE=$(( (CURRENT - 1 + TOTAL) % TOTAL ))
DAYS_REMAINING=$(( TOTAL - DAYS_INTO_CYCLE ))

# Alert thresholds
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
