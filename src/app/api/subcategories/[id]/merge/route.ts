import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
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
  const { target_id } = body;

  if (!target_id) {
    return NextResponse.json({ error: "target_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Reassign all expenses from source to target
  await admin
    .from("expenses")
    .update({ subcategory_id: target_id })
    .eq("subcategory_id", id);

  // Delete source subcategory
  await admin
    .from("subcategories")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  return NextResponse.json({ success: true });
}
