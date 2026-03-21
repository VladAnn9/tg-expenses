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
    });
  }
  return handler;
}
