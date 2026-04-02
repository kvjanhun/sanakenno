# Server Scripts

Monitoring and deployment scripts for Sanakenno infrastructure.

## Scripts

| Script | Purpose | Schedule |
|--------|---------|----------|
| `health-alert.sh` | Docker container health check for both sites | `*/5 * * * *` |
| `puzzle-rotation-alert.sh` | Warns when puzzle rotation is about to restart | `0 9 * * *` |
| `error-spike-alert.sh` | Alerts on error rate spikes in Docker logs | `*/5 * * * *` |

## Setup

All scripts source Telegram credentials from `/home/kvjanhun/.config/site-alerts.env`:
```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### Cron installation

```bash
# Copy scripts to server
cp server/scripts/*.sh /home/kvjanhun/scripts/

# Add to crontab
crontab -e
```

```cron
*/5 * * * * /home/kvjanhun/scripts/health-alert.sh
0 9 * * * /home/kvjanhun/scripts/puzzle-rotation-alert.sh
*/5 * * * * /home/kvjanhun/scripts/error-spike-alert.sh
```

The health-alert.sh replaces the existing single-site check from web_kontissa.
