import { NextRequest } from "next/server";
import { getBot, getWebhookHandler } from "@/lib/telegram/bot";
import { registerHandlers } from "@/lib/telegram/handlers";

// Roast generation runs in `after()` after the response flushes; allow headroom.
export const maxDuration = 30;

let initialized = false;

export async function POST(req: NextRequest) {
  try {
    if (!initialized) {
      registerHandlers(getBot());
      initialized = true;
    }
    return getWebhookHandler()(req);
  } catch (err) {
    // Last-resort: ack to Telegram so it stops retrying init failures.
    console.error("[webhook] fatal:", err);
    return new Response("ok", { status: 200 });
  }
}
