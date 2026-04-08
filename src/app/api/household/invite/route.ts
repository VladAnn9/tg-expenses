import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify user is household owner
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only household owner can create invites" },
      { status: 403 }
    );
  }

  const token = `hh_${nanoid(12)}`;

  const { data: invite, error } = await admin
    .from("household_invite_tokens")
    .insert({
      household_id: membership.household_id,
      created_by: user.id,
      token,
    })
    .select("token, expires_at")
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create invite" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

  return NextResponse.json({
    link: `${baseUrl}/dashboard/household?token=${invite.token}`,
    token: invite.token,
    expires_at: invite.expires_at,
  });
}
