import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    // Unset current primary
    await supabase
      .from("accounts")
      .update({ is_primary: false })
      .eq("user_id", user.id)
      .eq("is_primary", true);
    updates.is_primary = true;
  }

  const { data, error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
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

  // Check if account is primary
  const { data: account } = await admin
    .from("accounts")
    .select("is_primary")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (account.is_primary) {
    return NextResponse.json(
      { error: "Cannot delete primary account" },
      { status: 400 }
    );
  }

  // Check for linked expenses
  const { count } = await admin
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Reassign expenses before deleting this account" },
      { status: 400 }
    );
  }

  await admin.from("accounts").delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
