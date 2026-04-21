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

  const householdId = profile.household_id;

  // Clone household accounts for the leaving member so they keep their history.
  // Map: old household account id → new personal account id
  const { data: householdAccounts } = await admin
    .from("accounts")
    .select("id, name, type, currency, balance, notes, is_primary")
    .eq("household_id", householdId);

  const accountMap = new Map<string, string>();

  if (householdAccounts && householdAccounts.length > 0) {
    for (const acct of householdAccounts) {
      const { data: cloned } = await admin
        .from("accounts")
        .insert({
          user_id: user.id,
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
        accountMap.set(acct.id, cloned.id);
      }
    }

    // Reassign leaving member's expenses to their new personal accounts
    for (const [oldId, newId] of accountMap) {
      await admin
        .from("expenses")
        .update({ account_id: newId })
        .eq("account_id", oldId)
        .eq("created_by", user.id);

      await admin
        .from("income_entries")
        .update({ account_id: newId })
        .eq("account_id", oldId)
        .eq("created_by", user.id);
    }
  }

  // Remove from household_members
  await admin
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", user.id);

  // Clear profile household_id
  await admin
    .from("profiles")
    .update({ household_id: null })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
