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
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.amount !== undefined) {
    if (Number(body.amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }
    updates.amount = Number(body.amount);
  }
  if (body.source_label !== undefined) updates.source_label = body.source_label || null;
  if (body.note !== undefined) updates.note = body.note || null;
  if (body.income_date !== undefined) updates.income_date = body.income_date;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("income_entries")
    .update(updates)
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Income entry not found" }, { status: 404 });
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

  await admin
    .from("income_entries")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  return NextResponse.json({ success: true });
}
