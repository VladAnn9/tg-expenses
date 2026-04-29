import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHouseholdMemberIds } from "@/lib/supabase/household";
import { isValidCategory } from "@/lib/utils/categories";

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

  if (body.amount !== undefined) {
    if (Number(body.amount) <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }
    updates.amount = Number(body.amount);
  }
  if (body.category !== undefined) {
    if (!isValidCategory(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    updates.category = body.category;
  }
  if (body.merchant !== undefined) updates.merchant = body.merchant || null;
  if (body.note !== undefined) updates.note = body.note || null;
  if (body.expense_date !== undefined) updates.expense_date = body.expense_date;
  if (body.subcategory_id !== undefined) updates.subcategory_id = body.subcategory_id || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const memberIds = await getHouseholdMemberIds(admin, user.id);

  const { data, error } = await admin
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .in("created_by", memberIds)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
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
  const memberIds = await getHouseholdMemberIds(admin, user.id);

  await admin
    .from("expenses")
    .delete()
    .eq("id", id)
    .in("created_by", memberIds);

  return NextResponse.json({ success: true });
}
