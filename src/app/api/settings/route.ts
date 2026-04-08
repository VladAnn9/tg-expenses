import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("roast_enabled, telegram_id, household_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    roast_enabled: profile.roast_enabled,
    telegram_linked: !!profile.telegram_id,
    household_id: profile.household_id,
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  if (typeof body.roast_enabled !== "boolean") {
    return NextResponse.json(
      { error: "roast_enabled must be a boolean" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ roast_enabled: body.roast_enabled })
    .eq("id", user.id)
    .select("roast_enabled, telegram_id, household_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    roast_enabled: data.roast_enabled,
    telegram_linked: !!data.telegram_id,
    household_id: data.household_id,
  });
}
