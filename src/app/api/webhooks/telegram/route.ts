import { NextRequest } from "next/server";
import { getBot, getWebhookHandler } from "@/lib/telegram/bot";
import { registerHandlers } from "@/lib/telegram/handlers";

let initialized = false;

export async function POST(req: NextRequest) {
  if (!initialized) {
    registerHandlers(getBot());
    initialized = true;
  }

  const handler = getWebhookHandler();
  return handler(req);
}
