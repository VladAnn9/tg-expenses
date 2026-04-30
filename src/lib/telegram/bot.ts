import { Bot, webhookCallback } from "grammy";

let bot: Bot | null = null;

export function getBot(): Bot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not set");
    }
    bot = new Bot(token);
  }
  return bot;
}

let handler: ((req: Request) => Promise<Response>) | null = null;

export function getWebhookHandler(): (req: Request) => Promise<Response> {
  if (!handler) {
    handler = webhookCallback(getBot(), "std/http", {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
      // Just under Grammy's default 10s, well above our worst-case sync chain
      // after voice/photo offload to after(). Keeping onTimeout: "throw" (the
      // default) means a slow handler logs loudly via bot.catch and Telegram
      // retries; the dedup middleware absorbs the retry safely. The "return"
      // alternative is unsafe — Grammy maintainers warn it causes parallel
      // updates for the same chat to race on shared state.
      timeoutMilliseconds: 9000,
      onTimeout: "throw",
    });
  }
  return handler;
}
