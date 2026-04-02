# Server Scripts

Monitoring and deployment scripts for Sanakenno infrastructure.

## Scripts

| Script | Purpose | Schedule |
|--------|---------|----------|
| `health-alert.sh` | Docker container health check for both sites | `*/5 * * * *` |
| `puzzle-rotation-alert.sh` | Warns when puzzle rotation is about to restart | `0 9 * * *` |
| `error-spike-alert.sh` | Alerts on error rate spikes in Docker logs | `*/5 * * * *` |

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
*/5 * * * * ~/scripts/health-alert.sh
0 9 * * * ~/scripts/puzzle-rotation-alert.sh
*/5 * * * * ~/scripts/error-spike-alert.sh
```

The health-alert.sh replaces the existing single-site check.
