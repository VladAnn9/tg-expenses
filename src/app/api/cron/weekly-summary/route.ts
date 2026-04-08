import { NextRequest, NextResponse } from "next/server";
import { sendWeeklySummaries } from "@/lib/cron/weekly-summary";

export async function POST(req: NextRequest) {
  if (
    req.headers.get("authorization") !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await sendWeeklySummaries();
    return NextResponse.json({ ok: true, sent: count });
  } catch (error) {
    console.error("[cron] weekly-summary failed:", error);
    return NextResponse.json(
      { error: "Summary sending failed" },
      { status: 500 }
    );
  }
}
