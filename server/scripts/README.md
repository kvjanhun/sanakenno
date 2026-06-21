# Server Scripts

Monitoring and deployment scripts for Sanakenno infrastructure.

## Scripts

| Script | Purpose | Schedule |
|--------|---------|----------|
| `puzzle-rotation-alert.sh` | Warns when puzzle rotation is about to restart | `0 9 * * *` |
| `error-spike-alert.sh` | Alerts on error rate spikes in Docker logs | `*/5 * * * *` |

> **Container health monitoring lives in `web_kontissa`.** The combined
> health-alert script (covering both `sanakenno-a`/`sanakenno-b` and erez.ac)
> and its test harness now live in the web_kontissa repo at
> `server/health-alert.sh` / `server/health-alert-test.sh`, which owns the shared
> host plumbing for both sites. It is deployed to `~/scripts/health-alert.sh`
> from there.

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
