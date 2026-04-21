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

  // Check if user has a household
  const { data: profile } = await admin
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) {
    return NextResponse.json({ household: null });
  }

  // Get household with members
  const { data: household } = await admin
    .from("households")
    .select("id, name, created_at")
    .eq("id", profile.household_id)
    .single();

  if (!household) {
    return NextResponse.json({ household: null });
  }

  const { data: members } = await admin
    .from("household_members")
    .select("user_id, role, joined_at")
    .eq("household_id", household.id);

  // Get display names for members
  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", memberIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name])
  );

  return NextResponse.json({
    current_user_id: user.id,
    household: {
      id: household.id,
      name: household.name,
      created_at: household.created_at,
      members: (members ?? []).map((m) => ({
        user_id: m.user_id,
        display_name: profileMap.get(m.user_id) ?? "Unknown",
        role: m.role,
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check user doesn't already belong to a household
  const { data: profile } = await supabase
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
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Household name is required" },
      { status: 400 }
    );
  }

  // Use admin client to bypass RLS for this multi-step operation.
  // The cookie-based client can't SELECT the household before the user
  // is added as a member (RLS blocks it), so admin is needed.
  const admin = createAdminClient();

  const { data: household, error: hErr } = await admin
    .from("households")
    .insert({ name: name.trim() })
    .select("id, name, created_at")
    .single<{ id: string; name: string; created_at: string }>();

  if (hErr || !household) {
    return NextResponse.json(
      { error: hErr?.message ?? "Failed to create household" },
      { status: 500 }
    );
  }

  // Add creator as owner
  await admin.from("household_members").insert({
    household_id: household.id,
    user_id: user.id,
    role: "owner",
  });

  // Update profile
  await admin
    .from("profiles")
    .update({ household_id: household.id })
    .eq("id", user.id);

  // Link owner's existing accounts to the new household
  await admin
    .from("accounts")
    .update({ household_id: household.id })
    .eq("user_id", user.id)
    .is("household_id", null);

  return NextResponse.json(household, { status: 201 });
}

export async function DELETE() {
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
      { error: "Only the owner can delete the household" },
      { status: 403 }
    );
  }

  const householdId = membership.household_id;

  // Get all non-owner members so we can clone accounts for them
  const { data: otherMembers } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId)
    .neq("user_id", user.id);

  const { data: householdAccounts } = await admin
    .from("accounts")
    .select("id, name, type, currency, notes, is_primary")
    .eq("household_id", householdId);

  // Clone household accounts for each non-owner member and reassign their data
  if (otherMembers && householdAccounts) {
    for (const member of otherMembers) {
      for (const acct of householdAccounts) {
        const { data: cloned } = await admin
          .from("accounts")
          .insert({
            user_id: member.user_id,
            name: acct.name,
            type: acct.type,
            currency: acct.currency,
            balance: 0,
            notes: acct.notes,
            is_primary: acct.is_primary,
            household_id: null,
          })
          .select("id")
          .single();

        if (cloned) {
          await admin
            .from("expenses")
            .update({ account_id: cloned.id })
            .eq("account_id", acct.id)
            .eq("created_by", member.user_id);
          await admin
            .from("income_entries")
            .update({ account_id: cloned.id })
            .eq("account_id", acct.id)
            .eq("created_by", member.user_id);
        }
      }
    }
  }

  // Detach household accounts — they become personal accounts of the owner
  await admin
    .from("accounts")
    .update({ household_id: null })
    .eq("household_id", householdId);

  // Clear household_id for all members
  await admin
    .from("profiles")
    .update({ household_id: null })
    .eq("household_id", householdId);

  // Delete members
  await admin
    .from("household_members")
    .delete()
    .eq("household_id", householdId);

  // Delete the household (cascades invite tokens)
  await admin
    .from("households")
    .delete()
    .eq("id", householdId);

  return NextResponse.json({ success: true });
}
