import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHouseholdId, getHouseholdMemberIds } from "@/lib/supabase/household";
import type { ExpenseCategory } from "@/types/database";
import { CATEGORIES } from "@/lib/utils/categories";

/**
 * Resolves the user's primary account id (household-scoped when the user is
 * in a household, per-user otherwise). is_primary uniqueness is
 * application-enforced, not a DB constraint, so this must tolerate 0 or >1
 * primaries — first row wins, null means "no primary" (caller falls back to
 * all accounts).
 */
async function resolvePrimaryAccountId(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string | null> {
  const householdId = await getHouseholdId(admin, userId);
  const query = householdId
    ? admin.from("accounts").select("id").eq("household_id", householdId)
    : admin.from("accounts").select("id").eq("user_id", userId);

  const { data } = await query.eq("is_primary", true).limit(1);
  return data?.[0]?.id ?? null;
}

/**
 * Counts a confirmed subscription's expected charges that still lie ahead
 * inside the viewed month. next_expected is set once at detection and never
 * advanced afterwards, so stale anchors are rolled forward by the frequency
 * period first. Charges due today or earlier are treated as already
 * materialized in the running balance — only strictly-future charges reduce
 * safe-to-spend.
 */
function countUpcomingCharges(
  nextExpected: string,
  frequency: string,
  today: Date,
  monthStart: Date,
  monthEnd: Date
): number {
  const date = new Date(nextExpected);
  if (isNaN(date.getTime())) return 0;

  const step = () => {
    if (frequency === "weekly") date.setDate(date.getDate() + 7);
    else if (frequency === "yearly") date.setFullYear(date.getFullYear() + 1);
    else date.setMonth(date.getMonth() + 1);
  };

  while (date <= today) step();
  // When viewing a future month, charges due before it belong to earlier months
  while (date < monthStart) step();

  let count = 0;
  while (date < monthEnd) {
    count++;
    step();
  }
  return count;
}

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
  // Explicit ?account_id= overrides; otherwise scope to the primary account.
  // Null (no primary, no override) keeps the legacy all-accounts behavior.
  const accountId =
    searchParams.get("account_id") ??
    (await resolvePrimaryAccountId(admin, user.id));

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
  let incomeQuery = admin
    .from("income_entries")
    .select("amount")
    .in("created_by", memberIds)
    .gte("income_date", startDate)
    .lt("income_date", endDate);

  if (accountId) {
    incomeQuery = incomeQuery.eq("account_id", accountId);
  }

  const { data: incomeData } = await incomeQuery;

  const incomeTotal = (incomeData ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  // Previous month total
  const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? year - 1 : year;
  const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;

  let prevQuery = admin
    .from("expenses")
    .select("amount")
    .in("created_by", memberIds)
    .gte("expense_date", prevStartDate)
    .lt("expense_date", startDate);

  if (accountId) {
    prevQuery = prevQuery.eq("account_id", accountId);
  }

  const { data: prevExpenses } = await prevQuery;

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

  let tempoQuery = admin
    .from("expenses")
    .select("amount, expense_date, category, subcategory_id")
    .in("created_by", memberIds)
    .gte("expense_date", tempoStart)
    .lte("expense_date", now.toISOString().split("T")[0]);

  if (accountId) {
    tempoQuery = tempoQuery.eq("account_id", accountId);
  }

  const { data: tempoExpenses } = await tempoQuery;

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

  // Balance at start of month (carry-over from previous months) — sum across household.
  // undefined p_account_id is dropped from the JSON body, so the RPC's
  // DEFAULT NULL (= all accounts) applies.
  const balanceResults = await Promise.all(
    memberIds.map((id) =>
      admin.rpc("balance_at", {
        p_user_id: id,
        p_date: startDate,
        p_account_id: accountId ?? undefined,
      })
    )
  );
  const carryOver = balanceResults.reduce((sum, r) => sum + (Number(r.data) || 0), 0);

  // Running balance = carry-over + this month's income - this month's expenses
  const runningBalance = carryOver + incomeTotal - total;

  // Check if household has any income ever (for safe-to-spend visibility)
  const incomeCheckResults = await Promise.all(
    memberIds.map((id) =>
      admin.rpc("sum_income", {
        p_user_id: id,
        p_before: endDate,
        p_account_id: accountId ?? undefined,
      })
    )
  );
  const hasAnyIncome = incomeCheckResults.some((r) => (Number(r.data) || 0) > 0);

  // Safe to Spend (null if no income ever)
  let safeToSpend: number | null = null;
  if (hasAnyIncome) {
    // Subscriptions carry no account_id column, so they stay unscoped
    // (whole-household) even when the summary is account-scoped.
    const { data: confirmedSubs } = await admin
      .from("subscriptions")
      .select("amount, frequency, next_expected")
      .in("user_id", memberIds)
      .eq("status", "confirmed");

    // Frequency-aware: a sub that already charged this month is in the
    // running balance as a real expense, so only remaining occurrences are
    // subtracted — a weekly sub counts once per upcoming charge, not once flat.
    const monthStart = new Date(startDate);
    const monthEnd = new Date(endDate);
    const upcomingSubsTotal = (confirmedSubs ?? []).reduce(
      (sum, s) =>
        sum +
        Number(s.amount) *
          countUpcomingCharges(
            s.next_expected,
            s.frequency,
            now,
            monthStart,
            monthEnd
          ),
      0
    );
    safeToSpend = runningBalance - upcomingSubsTotal;
  }

  // Recent expenses — by creation time, so just-logged entries always appear at top
  let recentQuery = admin
    .from("expenses")
    .select("id, amount, category, merchant, expense_date, note, created_by")
    .in("created_by", memberIds);

  if (accountId) {
    recentQuery = recentQuery.eq("account_id", accountId);
  }

  const { data: recent } = await recentQuery
    .order("created_at", { ascending: false })
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
