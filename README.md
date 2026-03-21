# Zen Finance

AI-driven expense tracking via Telegram (voice, receipt photo, text) with a mobile-first web dashboard. Currency: PLN.

## How it works

1. Sign in with Google on the web app
2. Link your Telegram account via a one-tap deep link
3. Send expenses to the bot: text ("15 coffee"), voice memo, or receipt photo
4. Bot parses via AI (Gemini + Groq Whisper), asks for confirmation
5. Review and edit on the web dashboard

## Setup

### Prerequisites

- Node.js 18+
- Supabase project with schema applied
- Google OAuth credentials configured in Supabase
- Telegram bot via [@BotFather](https://t.me/BotFather)
- [ngrok](https://ngrok.com/) for local Telegram webhook testing

### Environment variables

Copy `.env` and fill in all values:

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard > Settings > API (anon/public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard > Settings > API (service_role key) |
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Your bot's username (without @) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/apikey) |

### Run

```bash
npm install
npm run dev
```

### Telegram bot (local)

In separate terminals:

```bash
# 1. Start ngrok
ngrok http 3000

# 2. Set webhook (replace URL with your ngrok https URL)
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<NGROK_URL>/api/webhooks/telegram&secret_token=<WEBHOOK_SECRET>"

# 3. Start dev server
npm run dev
```

### Other commands

```bash
npm run build       # Production build
npm run lint        # ESLint
npm run webhook:set -- https://your-domain.com  # Set webhook to production URL
npm run webhook:set                             # Check current webhook status
```

## Tech stack

Next.js 16 | Supabase | Grammy | Gemini 2.5 Flash | Groq Whisper | Recharts | Tailwind CSS
