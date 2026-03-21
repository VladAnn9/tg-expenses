import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/types/database";
import { CATEGORIES } from "@/lib/utils/categories";

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

  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate =
    monthNum === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, category")
    .eq("created_by", user.id)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);

  const rows = expenses ?? [];
  const total = rows.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = CATEGORIES.map((cat: ExpenseCategory) => {
    const items = rows.filter((e) => e.category === cat);
    const catTotal = items.reduce((sum, e) => sum + Number(e.amount), 0);
    return {
      category: cat,
      total: catTotal,
      count: items.length,
      percentage: total > 0 ? Math.round((catTotal / total) * 1000) / 10 : 0,
    };
  });

  // Recent expenses
  const { data: recent } = await supabase
    .from("expenses")
    .select("id, amount, category, merchant, expense_date, note")
    .eq("created_by", user.id)
    .order("expense_date", { ascending: false })
    .limit(10);

  return NextResponse.json({
    month,
    total,
    by_category: byCategory,
    recent_expenses: recent ?? [],
  });
}
