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
  const now = new Date();
  const month =
    searchParams.get("month") ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const category = searchParams.get("category");
  const accountId = searchParams.get("account_id");
  const subcategoryId = searchParams.get("subcategory_id");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const offset = Number(searchParams.get("offset") || 0);

  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate =
    monthNum === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

  let query = admin
    .from("expenses")
    .select("*", { count: "exact" })
    .in("created_by", memberIds)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && isValidCategory(category)) {
    query = query.eq("category", category);
  }

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  if (subcategoryId) {
    query = query.eq("subcategory_id", subcategoryId);
  }

  const { data, count } = await query;

  // Month total
  const { data: totalData } = await admin
    .from("expenses")
    .select("amount")
    .in("created_by", memberIds)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);

  const monthTotal = (totalData ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  return NextResponse.json({
    expenses: data ?? [],
    total: count ?? 0,
    month_total: monthTotal,
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

  const body = await req.json();
  const {
    amount,
    category,
    merchant,
    note,
    expense_date,
    account_id,
    subcategory_id,
  } = body;

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than 0" },
      { status: 400 }
    );
  }

  if (!category || !isValidCategory(category)) {
    return NextResponse.json(
      { error: "Invalid category" },
      { status: 400 }
    );
  }

  // Subcategories are shared across the household, so ownership is checked
  // against all member ids (same scoping as GET /api/subcategories).
  if (subcategory_id) {
    const admin = createAdminClient();
    const memberIds = await getHouseholdMemberIds(admin, user.id);
    const { data: subcategory } = await admin
      .from("subcategories")
      .select("id, parent_category")
      .eq("id", subcategory_id)
      .in("created_by", memberIds)
      .single();

    if (!subcategory || subcategory.parent_category !== category) {
      return NextResponse.json(
        { error: "Invalid subcategory" },
        { status: 400 }
      );
    }
  }

  // Use provided account_id or find primary account
  let resolvedAccountId = account_id;
  if (!resolvedAccountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .limit(1)
      .single();

    if (!account) {
      // Fallback to first account
      const { data: fallback } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      resolvedAccountId = fallback?.id;
    } else {
      resolvedAccountId = account.id;
    }
  }

  if (!resolvedAccountId) {
    return NextResponse.json(
      { error: "No account found" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      account_id: resolvedAccountId,
      amount: Number(amount),
      currency: "PLN",
      category,
      merchant: merchant || null,
      note: note || null,
      subcategory_id: subcategory_id || null,
      source: "web" as const,
      expense_date: expense_date || new Date().toISOString().split("T")[0],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
