#!/bin/bash
# Set Telegram webhook to a given URL.
# Usage: npm run webhook:set -- https://your-domain.com
# Without args, shows current webhook info.

set -e

if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)
fi
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep -v '^\s*$' | xargs)
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN not set"
  exit 1
fi

if [ -z "$1" ]; then
  echo "Current webhook info:"
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool
  exit 0
fi

URL="${1}/api/webhooks/telegram"
RESULT=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${URL}" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}")

echo "$RESULT" | python3 -m json.tool
