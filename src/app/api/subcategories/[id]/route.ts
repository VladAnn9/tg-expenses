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

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subcategories")
    .update({ name: body.name.trim() })
    .eq("id", id)
    .eq("created_by", user.id)
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

  // Check if any expenses use this subcategory
  const { count } = await admin
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("subcategory_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Reassign or remove expenses from this subcategory first" },
      { status: 400 }
    );
  }

  await admin
    .from("subcategories")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  return NextResponse.json({ success: true });
}
