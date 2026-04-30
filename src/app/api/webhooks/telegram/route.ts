import { NextRequest } from "next/server";
import { getBot, getWebhookHandler } from "@/lib/telegram/bot";
import { registerHandlers } from "@/lib/telegram/handlers";

// Roast generation runs in `after()` after the response flushes; allow headroom.
export const maxDuration = 30;

let initialized = false;

export async function POST(req: NextRequest) {
  if (!initialized) {
    registerHandlers(getBot());
    initialized = true;
  }

  const handler = getWebhookHandler();
  return handler(req);
}
