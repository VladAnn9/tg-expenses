import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHouseholdMemberIds } from "@/lib/supabase/household";
import { isValidCategory } from "@/lib/utils/categories";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const memberIds = await getHouseholdMemberIds(admin, user.id);
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const month = searchParams.get("month");
  const accountId = searchParams.get("account_id");

  let dateRange: { startDate: string; endDate: string } | null = null;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const endDate =
      monthNum === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;
    dateRange = { startDate, endDate };
  }

  let query = admin
    .from("subcategories")
    .select("id, name, parent_category, created_at")
    .in("created_by", memberIds)
    .order("name");

  if (category && isValidCategory(category)) {
    query = query.eq("parent_category", category);
  }

  const { data: subcategories } = await query;

  // Count expenses per subcategory within the same scope the UI applies
  // (household members + month + account). Counting all-time/all-users would
  // not match the filtered list shown to the user.
  const result = await Promise.all(
    (subcategories ?? []).map(async (sub) => {
      let countQuery = admin
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("subcategory_id", sub.id)
        .in("created_by", memberIds);
      if (dateRange) {
        countQuery = countQuery
          .gte("expense_date", dateRange.startDate)
          .lt("expense_date", dateRange.endDate);
      }
      if (accountId) {
        countQuery = countQuery.eq("account_id", accountId);
      }
      const { count } = await countQuery;
      return { ...sub, expense_count: count ?? 0 };
    })
  );

  return NextResponse.json({ subcategories: result });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { name, parent_category } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!parent_category || !isValidCategory(parent_category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get user's household_id for shared subcategories
  const { data: profile } = await admin
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const { data, error } = await admin
    .from("subcategories")
    .insert({
      name: name.trim(),
      parent_category,
      household_id: profile?.household_id ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
