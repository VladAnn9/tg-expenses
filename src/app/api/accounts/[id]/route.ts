import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHouseholdOwner } from "@/lib/supabase/household";

/** Check if user can manage this account (own account or household owner). */
async function canManageAccount(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  accountId: string
) {
  const { data: account } = await admin
    .from("accounts")
    .select("id, user_id, household_id, is_primary")
    .eq("id", accountId)
    .single();

  if (!account) return { allowed: false as const, account: null };

  // Own account — always allowed
  if (account.user_id === userId) return { allowed: true as const, account };

  // Household account — check if user is owner
  if (account.household_id) {
    const owner = await isHouseholdOwner(admin, userId, account.household_id);
    if (owner) return { allowed: true as const, account };
  }

  return { allowed: false as const, account: null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { allowed, account } = await canManageAccount(admin, user.id, id);
  if (!allowed || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.notes !== undefined) updates.notes = body.notes || null;
  if (body.type !== undefined) {
    const validTypes = ["checking", "savings", "cash", "credit"];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }
    updates.type = body.type;
  }

  if (body.is_primary === true) {
    // Unset current primary across household or user scope
    if (account.household_id) {
      await admin
        .from("accounts")
        .update({ is_primary: false })
        .eq("household_id", account.household_id)
        .eq("is_primary", true);
    } else {
      await admin
        .from("accounts")
        .update({ is_primary: false })
        .eq("user_id", user.id)
        .eq("is_primary", true);
    }
    updates.is_primary = true;
  }

  const { data, error } = await admin
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { allowed, account } = await canManageAccount(admin, user.id, id);
  if (!allowed || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (account.is_primary) {
    return NextResponse.json(
      { error: "Cannot delete primary account" },
      { status: 400 }
    );
  }

  // Check for linked expenses
  const { count: expCount } = await admin
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);

  // Check for linked income
  const { count: incCount } = await admin
    .from("income_entries")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);

  if ((expCount ?? 0) > 0 || (incCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "Reassign expenses/income before deleting this account" },
      { status: 400 }
    );
  }

  await admin.from("accounts").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
