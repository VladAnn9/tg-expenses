import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHouseholdId, isHouseholdOwner } from "@/lib/supabase/household";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const householdId = await getHouseholdId(admin, user.id);

  const query = householdId
    ? admin.from("accounts").select("*").eq("household_id", householdId)
    : admin.from("accounts").select("*").eq("user_id", user.id);

  const { data } = await query.order("is_primary", { ascending: false }).order("created_at");

  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const householdId = await getHouseholdId(admin, user.id);

  // Only household owner can create accounts for the household
  if (householdId) {
    const owner = await isHouseholdOwner(admin, user.id, householdId);
    if (!owner) {
      return NextResponse.json(
        { error: "Only the household owner can create accounts" },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const { name, type, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Account name is required" },
      { status: 400 }
    );
  }

  const validTypes = ["checking", "savings", "cash", "credit"];
  if (type && !validTypes.includes(type)) {
    return NextResponse.json(
      { error: "Invalid account type" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("accounts")
    .insert({
      user_id: user.id,
      name: name.trim(),
      type: type || "checking",
      notes: notes || null,
      household_id: householdId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
