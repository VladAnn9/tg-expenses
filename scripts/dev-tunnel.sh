#!/bin/bash
# Start ngrok tunnel and auto-set Telegram webhook, then run Next.js dev server.
# Usage: npm run dev:tunnel
# Requires: ngrok (brew install ngrok)

# Load env vars
if [ -f .env ]; then
  set -a
  source <(grep -v '^#' .env | grep -v '^\s*$')
  set +a
fi
if [ -f .env.local ]; then
  set -a
  source <(grep -v '^#' .env.local | grep -v '^\s*$')
  set +a
fi

if ! command -v ngrok &> /dev/null; then
  echo "ngrok is not installed. Install with: brew install ngrok"
  exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "TELEGRAM_BOT_TOKEN not set in .env"
  exit 1
fi

cleanup() {
  echo ""
  echo "Shutting down..."
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook" > /dev/null 2>&1
  echo "Telegram webhook removed."
  kill 0 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT

# Start ngrok in background
ngrok http 3000 --log=stdout > /tmp/ngrok.log 2>&1 &

# Wait for ngrok to start and get the public URL
echo "Starting ngrok tunnel..."
NGROK_URL=""
for i in $(seq 1 30); do
  sleep 1
  NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
    | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    for t in tunnels:
        if t.get('public_url', '').startswith('https'):
            print(t['public_url'])
            break
except:
    pass
" 2>/dev/null)
  if [ -n "$NGROK_URL" ]; then
    break
  fi
done

if [ -z "$NGROK_URL" ]; then
  echo "Failed to get ngrok URL after 30s. Check: cat /tmp/ngrok.log"
  exit 1
fi

echo "ngrok tunnel: $NGROK_URL"

# Set Telegram webhook
WEBHOOK_URL="${NGROK_URL}/api/webhooks/telegram"
RESULT=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${WEBHOOK_URL}" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}")

if echo "$RESULT" | python3 -c "import sys,json; exit(0 if json.load(sys.stdin).get('ok') else 1)" 2>/dev/null; then
  echo "Telegram webhook set: $WEBHOOK_URL"
else
  echo "Failed to set webhook: $RESULT"
  exit 1
fi

echo ""
echo "Starting Next.js dev server..."
echo "---"

exec npx next dev
