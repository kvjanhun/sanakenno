# Server Scripts

Monitoring and deployment scripts for Sanakenno infrastructure.

## Scripts

| Script | Purpose | Schedule |
|--------|---------|----------|
| `puzzle-rotation-alert.sh` | Warns when fresh puzzles are running out (7 days, 1 day, and on restart) | `0 9 * * *` |
| `error-spike-alert.sh` | Alerts on error rate spikes in Docker logs | `*/5 * * * *` |

> **Container health monitoring lives in the `nuc` repo.** The combined
> health monitor covers both sanakenno.fi and erez.ac, so it is host-level:
> `~/Projects/nuc/scripts/health-alert.sh`, with its test harness alongside it.

## Setup

All scripts read Telegram credentials from `~/.config/site-alerts.env` by default
(override with `ALERT_ENV_FILE`):
```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### Cron installation

```bash
# Copy scripts to server
cp server/scripts/*.sh ~/scripts/

# Add to crontab
crontab -e
```

```cron
0 9 * * * ~/scripts/puzzle-rotation-alert.sh
*/5 * * * * ~/scripts/error-spike-alert.sh
```
