import { NextRequest, NextResponse } from "next/server";
import { detectSubscriptions } from "@/lib/cron/detect-subscriptions";

export async function POST(req: NextRequest) {
  if (
    req.headers.get("authorization") !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await detectSubscriptions();
    return NextResponse.json({ ok: true, new_suggestions: count });
  } catch (error) {
    console.error("[cron] detect-subscriptions failed:", error);
    return NextResponse.json(
      { error: "Detection failed" },
      { status: 500 }
    );
  }
}
