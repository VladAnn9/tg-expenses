import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = `zen_${nanoid(12)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await supabase.from("telegram_link_requests").insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 }
    );
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "ZenFinanceExpenseBot";
  const link = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({ link, token, expires_at: expiresAt });
}
