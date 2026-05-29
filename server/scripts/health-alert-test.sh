#!/bin/bash
# Mocked test harness for health-alert.sh. Does not require Docker, network, or
# Telegram credentials.

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_UNDER_TEST="${SCRIPT_DIR}/health-alert.sh"
CASE="${1:-all}"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

setup_tmp() {
  TMP_DIR="$(mktemp -d)"
  STATE_FILE="${TMP_DIR}/docker-state"
  ALERT_LOG="${TMP_DIR}/telegram.log"
  mkdir -p "${TMP_DIR}/bin" "${TMP_DIR}/state"
  : > "$ALERT_LOG"

  cat > "${TMP_DIR}/bin/docker" <<'EOF'
#!/bin/bash
set -eu

COMMAND="$1"
shift

last_arg() {
  LAST=""
  for ARG in "$@"; do
    LAST="$ARG"
  done
  printf '%s\n' "$LAST"
}

case "$COMMAND" in
  inspect)
    CONTAINER="$(last_arg "$@")"
    STATUS="$(awk -F= -v key="inspect:${CONTAINER}" '$1 == key { value = $2 } END { print value }' "$FAKE_DOCKER_STATE")"
    case "$STATUS" in
      healthy|unhealthy|starting|no-healthcheck)
        printf '%s\n' "$STATUS"
        exit 0
        ;;
      *)
        exit 1
        ;;
    esac
    ;;
  ps)
    awk -F= '$1 ~ /^exists:/ && $2 == "yes" { sub(/^exists:/, "", $1); print $1 }' "$FAKE_DOCKER_STATE"
    ;;
  *)
    exit 1
    ;;
esac
EOF
  chmod +x "${TMP_DIR}/bin/docker"

  cat > "${TMP_DIR}/bin/curl" <<'EOF'
#!/bin/bash
if [ "${FAKE_SITE_HEALTH:-ok}" = "ok" ]; then
  exit 0
fi
exit 22
EOF
  chmod +x "${TMP_DIR}/bin/curl"
}

cleanup_tmp() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

write_state() {
  cat > "$STATE_FILE"
}

run_monitor() {
  FAKE_SITE_HEALTH="${1:-ok}" \
  FAKE_DOCKER_STATE="$STATE_FILE" \
  PATH="${TMP_DIR}/bin:$PATH" \
  HEALTH_ALERT_STATE_DIR="${TMP_DIR}/state" \
  HEALTH_ALERT_TELEGRAM_LOG="$ALERT_LOG" \
  HEALTH_ALERT_MISSING_THRESHOLD="${HEALTH_ALERT_MISSING_THRESHOLD:-2}" \
  HEALTH_ALERT_DOCKER_RETRIES=1 \
  HEALTH_ALERT_DOCKER_RETRY_DELAY=0 \
    bash "$SCRIPT_UNDER_TEST"
}

assert_log_empty() {
  [ ! -s "$ALERT_LOG" ] || fail "expected no alerts, got: $(cat "$ALERT_LOG")"
}

assert_log_contains() {
  grep -Fq "$1" "$ALERT_LOG" || fail "expected alert log to contain: $1"
}

reset_log() {
  : > "$ALERT_LOG"
}

case_transient_missing() {
  setup_tmp
  trap cleanup_tmp EXIT

  write_state <<'EOF'
inspect:sanakenno-a=fail
exists:sanakenno-a=yes
inspect:sanakenno-b=healthy
exists:sanakenno-b=yes
inspect:web_kontissa-web-1=healthy
exists:web_kontissa-web-1=yes
EOF
  run_monitor ok
  assert_log_empty

  write_state <<'EOF'
inspect:sanakenno-a=healthy
exists:sanakenno-a=yes
inspect:sanakenno-b=healthy
exists:sanakenno-b=yes
inspect:web_kontissa-web-1=healthy
exists:web_kontissa-web-1=yes
EOF
  run_monitor ok
  assert_log_empty
  [ ! -f "${TMP_DIR}/state/sanakenno-a-missing.count" ] || fail "missing streak was not cleared"
}

case_inspect_unavailable_site_ok() {
  setup_tmp
  trap cleanup_tmp EXIT

  write_state <<'EOF'
inspect:sanakenno-a=fail
exists:sanakenno-a=yes
inspect:sanakenno-b=healthy
exists:sanakenno-b=yes
inspect:web_kontissa-web-1=healthy
exists:web_kontissa-web-1=yes
EOF
  run_monitor ok
  run_monitor ok
  assert_log_empty
}

case_repeated_missing() {
  setup_tmp
  trap cleanup_tmp EXIT

  write_state <<'EOF'
inspect:sanakenno-a=missing
exists:sanakenno-a=no
inspect:sanakenno-b=healthy
exists:sanakenno-b=yes
inspect:web_kontissa-web-1=healthy
exists:web_kontissa-web-1=yes
EOF
  run_monitor failed
  assert_log_empty
  run_monitor failed
  assert_log_contains "sanakenno.fi (a) is down"
  assert_log_contains "Status: <code>missing</code>"
}

case_recovery() {
  setup_tmp
  trap cleanup_tmp EXIT

  write_state <<'EOF'
inspect:sanakenno-a=missing
exists:sanakenno-a=no
inspect:sanakenno-b=healthy
exists:sanakenno-b=yes
inspect:web_kontissa-web-1=healthy
exists:web_kontissa-web-1=yes
EOF
  run_monitor failed
  run_monitor failed
  reset_log

  write_state <<'EOF'
inspect:sanakenno-a=healthy
exists:sanakenno-a=yes
inspect:sanakenno-b=healthy
exists:sanakenno-b=yes
inspect:web_kontissa-web-1=healthy
exists:web_kontissa-web-1=yes
EOF
  run_monitor ok
  assert_log_contains "sanakenno.fi (a) is back up"
}

case_unhealthy() {
  setup_tmp
  trap cleanup_tmp EXIT

  write_state <<'EOF'
inspect:sanakenno-a=healthy
exists:sanakenno-a=yes
inspect:sanakenno-b=unhealthy
exists:sanakenno-b=yes
inspect:web_kontissa-web-1=healthy
exists:web_kontissa-web-1=yes
EOF
  run_monitor ok
  assert_log_contains "sanakenno.fi (b) is down"
  assert_log_contains "Status: <code>unhealthy</code>"
}

case "$CASE" in
  transient-missing)
    case_transient_missing
    ;;
  inspect-unavailable-site-ok)
    case_inspect_unavailable_site_ok
    ;;
  repeated-missing)
    case_repeated_missing
    ;;
  recovery)
    case_recovery
    ;;
  unhealthy)
    case_unhealthy
    ;;
  all)
    case_transient_missing
    cleanup_tmp
    trap - EXIT
    case_inspect_unavailable_site_ok
    cleanup_tmp
    trap - EXIT
    case_repeated_missing
    cleanup_tmp
    trap - EXIT
    case_recovery
    cleanup_tmp
    trap - EXIT
    case_unhealthy
    cleanup_tmp
    trap - EXIT
    ;;
  *)
    fail "unknown case: $CASE"
    ;;
esac

printf 'health-alert %s: ok\n' "$CASE"
