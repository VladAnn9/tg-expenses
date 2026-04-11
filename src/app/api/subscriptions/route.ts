import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHouseholdMemberIds } from "@/lib/supabase/household";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const memberIds = await getHouseholdMemberIds(admin, user.id);
  const { data: subscriptions, error } = await admin
    .from("subscriptions")
    .select("*")
    .in("user_id", memberIds)
    .neq("status", "dismissed")
    .order("next_expected", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = (subscriptions ?? []) as Array<Record<string, unknown>>;
  const suggested = all.filter((s) => s.status === "suggested");
  const confirmed = all.filter((s) => s.status === "confirmed");

  return NextResponse.json({ suggested, confirmed });
}
