import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Check user doesn't already belong to a household
  const { data: profile } = await admin
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (profile?.household_id) {
    return NextResponse.json(
      { error: "Already in a household" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Invite token is required" },
      { status: 400 }
    );
  }

  // Find valid token
  const { data: invite } = await admin
    .from("household_invite_tokens")
    .select("id, household_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!invite) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 }
    );
  }

  if (invite.used_at) {
    return NextResponse.json(
      { error: "Invite token already used" },
      { status: 400 }
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Invite token has expired" },
      { status: 400 }
    );
  }

  // Check household isn't full (max 2 members)
  const { count } = await admin
    .from("household_members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", invite.household_id);

  if ((count ?? 0) >= 2) {
    return NextResponse.json(
      { error: "Household is full (max 2 members)" },
      { status: 409 }
    );
  }

  // Add member
  const { error: memberErr } = await admin
    .from("household_members")
    .insert({
      household_id: invite.household_id,
      user_id: user.id,
      role: "member",
    });

  if (memberErr) {
    return NextResponse.json(
      { error: memberErr.message },
      { status: 500 }
    );
  }

  // Update profile
  await admin
    .from("profiles")
    .update({ household_id: invite.household_id })
    .eq("id", user.id);

  // Mark token as used
  await admin
    .from("household_invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({
    household_id: invite.household_id,
    role: "member",
  });
}
