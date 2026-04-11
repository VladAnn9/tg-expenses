import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHouseholdMemberIds } from "@/lib/supabase/household";
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

  const admin = createAdminClient();
  const memberIds = await getHouseholdMemberIds(admin, user.id);
  const { searchParams } = req.nextUrl;
  const now = new Date();
  const month =
    searchParams.get("month") ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const accountId = searchParams.get("account_id");

  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate =
    monthNum === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

  // Current month expenses
  let expenseQuery = admin
    .from("expenses")
    .select("amount, category, expense_date, subcategory_id")
    .in("created_by", memberIds)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);

  if (accountId) {
    expenseQuery = expenseQuery.eq("account_id", accountId);
  }

  const { data: expenses } = await expenseQuery;
  const rows = expenses ?? [];
  const total = rows.reduce((sum, e) => sum + Number(e.amount), 0);

  // Get subcategory names for the breakdown
  const subIds = [...new Set(rows.map((e) => e.subcategory_id).filter((id): id is string => !!id))];
  const subNameMap = new Map<string, string>();
  if (subIds.length > 0) {
    const { data: subs } = await admin
      .from("subcategories")
      .select("id, name")
      .in("id", subIds);
    for (const s of subs ?? []) {
      subNameMap.set(s.id, s.name);
    }
  }

  const byCategory = CATEGORIES.map((cat: ExpenseCategory) => {
    const items = rows.filter((e) => e.category === cat);
    const catTotal = items.reduce((sum, e) => sum + Number(e.amount), 0);

    // Subcategory breakdown
    const subMap = new Map<string, { name: string; total: number; count: number }>();
    for (const item of items) {
      const subName = item.subcategory_id ? subNameMap.get(item.subcategory_id) ?? "Other" : "Uncategorized";
      const key = item.subcategory_id ?? "_none";
      const existing = subMap.get(key);
      if (existing) {
        existing.total += Number(item.amount);
        existing.count++;
      } else {
        subMap.set(key, { name: subName, total: Number(item.amount), count: 1 });
      }
    }
    const subcategories = [...subMap.values()]
      .filter((s) => s.name !== "Uncategorized" || subMap.size > 1)
      .sort((a, b) => b.total - a.total);

    return {
      category: cat,
      total: catTotal,
      count: items.length,
      percentage: total > 0 ? Math.round((catTotal / total) * 1000) / 10 : 0,
      subcategories: subcategories.length > 0 && !(subcategories.length === 1 && subcategories[0].name === "Uncategorized")
        ? subcategories
        : [],
    };
  });

  // Income total
  const { data: incomeData } = await admin
    .from("income_entries")
    .select("amount")
    .in("created_by", memberIds)
    .gte("income_date", startDate)
    .lt("income_date", endDate);

  const incomeTotal = (incomeData ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  // Previous month total
  const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? year - 1 : year;
  const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;

  const { data: prevExpenses } = await admin
    .from("expenses")
    .select("amount")
    .in("created_by", memberIds)
    .gte("expense_date", prevStartDate)
    .lt("expense_date", startDate);

  const previousMonthTotal = (prevExpenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  // Pace projection
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const paceProjection =
    dayOfMonth > 0
      ? Math.round(((total / dayOfMonth) * daysInMonth) * 100) / 100
      : 0;

  // Tempo (last 7 days)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const tempoStart = sevenDaysAgo.toISOString().split("T")[0];

  const { data: tempoExpenses } = await admin
    .from("expenses")
    .select("amount, expense_date, category, subcategory_id")
    .in("created_by", memberIds)
    .gte("expense_date", tempoStart)
    .lte("expense_date", now.toISOString().split("T")[0]);

  // Get subcategory names for tempo breakdown
  const tempoSubIds = [...new Set((tempoExpenses ?? []).map((e) => e.subcategory_id).filter((id): id is string => !!id))];
  const subcatNameMap = new Map<string, string>();
  if (tempoSubIds.length > 0) {
    const { data: subs } = await admin
      .from("subcategories")
      .select("id, name")
      .in("id", tempoSubIds);
    for (const s of subs ?? []) {
      subcatNameMap.set(s.id, s.name);
    }
  }

  type TempoCategory = { category: string; subcategory?: string; amount: number };
  const tempoMap = new Map<string, { total: number; categories: TempoCategory[] }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    tempoMap.set(d.toISOString().split("T")[0], { total: 0, categories: [] });
  }
  for (const e of tempoExpenses ?? []) {
    const date = e.expense_date;
    const entry = tempoMap.get(date);
    if (entry) {
      entry.total += Number(e.amount);
      const existing = entry.categories.find(
        (c) => c.category === e.category && c.subcategory === (e.subcategory_id ? subcatNameMap.get(e.subcategory_id) : undefined)
      );
      if (existing) {
        existing.amount += Number(e.amount);
      } else {
        entry.categories.push({
          category: e.category as string,
          subcategory: e.subcategory_id ? subcatNameMap.get(e.subcategory_id) : undefined,
          amount: Number(e.amount),
        });
      }
    }
  }
  const tempo = [...tempoMap.entries()].map(([date, t]) => ({
    date,
    total: t.total,
    categories: t.categories.sort((a, b) => b.amount - a.amount),
  }));

  // Balance at start of month (carry-over from previous months) — sum across household
  const balanceResults = await Promise.all(
    memberIds.map((id) => admin.rpc("balance_at", { p_user_id: id, p_date: startDate }))
  );
  const carryOver = balanceResults.reduce((sum, r) => sum + (Number(r.data) || 0), 0);

  // Running balance = carry-over + this month's income - this month's expenses
  const runningBalance = carryOver + incomeTotal - total;

  // Check if household has any income ever (for safe-to-spend visibility)
  const incomeCheckResults = await Promise.all(
    memberIds.map((id) => admin.rpc("sum_income", { p_user_id: id, p_before: endDate }))
  );
  const hasAnyIncome = incomeCheckResults.some((r) => (Number(r.data) || 0) > 0);

  // Safe to Spend (null if no income ever)
  let safeToSpend: number | null = null;
  if (hasAnyIncome) {
    const { data: confirmedSubs } = await admin
      .from("subscriptions")
      .select("amount")
      .in("user_id", memberIds)
      .eq("status", "confirmed");

    const monthlySubsTotal = (confirmedSubs ?? []).reduce(
      (sum, s) => sum + Number(s.amount),
      0
    );
    safeToSpend = runningBalance - monthlySubsTotal;
  }

  // Recent expenses
  const { data: recent } = await admin
    .from("expenses")
    .select("id, amount, category, merchant, expense_date, note, created_by")
    .in("created_by", memberIds)
    .order("expense_date", { ascending: false })
    .limit(10);

  return NextResponse.json({
    month,
    total,
    income_total: incomeTotal,
    carry_over: carryOver,
    balance: runningBalance,
    safe_to_spend: safeToSpend,
    pace_projection: paceProjection,
    previous_month_total: previousMonthTotal,
    by_category: byCategory,
    recent_expenses: recent ?? [],
    tempo,
  });
}
