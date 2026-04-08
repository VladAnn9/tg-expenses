import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) {
    return NextResponse.json(
      { error: "Not in a household" },
      { status: 400 }
    );
  }

  // Remove from household_members
  await admin
    .from("household_members")
    .delete()
    .eq("household_id", profile.household_id)
    .eq("user_id", user.id);

  // Clear profile household_id
  await admin
    .from("profiles")
    .update({ household_id: null })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
