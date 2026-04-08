import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  if (
    req.headers.get("authorization") !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    await supabase.from("profiles").select("id").limit(1);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[keep-alive] Ping failed:", error);
    return NextResponse.json({ error: "Ping failed" }, { status: 500 });
  }
}
