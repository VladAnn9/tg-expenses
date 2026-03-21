import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidCategory } from "@/lib/utils/categories";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const month =
    searchParams.get("month") ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const offset = Number(searchParams.get("offset") || 0);

  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate =
    monthNum === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

  let query = supabase
    .from("expenses")
    .select("*", { count: "exact" })
    .eq("created_by", user.id)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate)
    .order("expense_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && isValidCategory(category)) {
    query = query.eq("category", category);
  }

  const { data, count } = await query;

  // Month total
  const { data: totalData } = await supabase
    .from("expenses")
    .select("amount")
    .eq("created_by", user.id)
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
  const { amount, category, merchant, note, expense_date } = body;

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

  // Get default account
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!account) {
    return NextResponse.json(
      { error: "No account found" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      account_id: account.id,
      amount: Number(amount),
      currency: "PLN",
      category,
      merchant: merchant || null,
      note: note || null,
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
