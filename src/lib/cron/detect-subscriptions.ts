import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionFrequency } from "@/types/database";

interface ExpenseGroup {
  user_id: string;
  merchant: string;
  amounts: number[];
  dates: string[];
  expense_ids: string[];
}

function amountsAreConsistent(amounts: number[]): boolean {
  if (amounts.length < 2) return false;
  const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  if (avg === 0) return false;
  return amounts.every((a) => Math.abs(a - avg) / avg <= 0.1);
}

function detectFrequency(
  dates: string[]
): { frequency: SubscriptionFrequency; nextExpected: string } | null {
  if (dates.length < 2) return null;

  const sorted = dates
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs = sorted[i].getTime() - sorted[i - 1].getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    gaps.push(diffDays);
  }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const lastDate = sorted[sorted.length - 1];

  // Weekly: ~7 +/- 2 days
  if (avgGap >= 5 && avgGap <= 9 && gaps.every((g) => g >= 5 && g <= 9)) {
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 7);
    return {
      frequency: "weekly",
      nextExpected: next.toISOString().split("T")[0],
    };
  }

  // Monthly: ~28-31 days
  if (avgGap >= 26 && avgGap <= 35 && gaps.every((g) => g >= 26 && g <= 35)) {
    const next = new Date(lastDate);
    next.setMonth(next.getMonth() + 1);
    return {
      frequency: "monthly",
      nextExpected: next.toISOString().split("T")[0],
    };
  }

  return null;
}

export async function detectSubscriptions(): Promise<number> {
  const supabase = createAdminClient();

  // Get expenses from the last 2 months with non-null merchant
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const sinceDate = twoMonthsAgo.toISOString().split("T")[0];

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("id, created_by, merchant, amount, expense_date")
    .not("merchant", "is", null)
    .gte("expense_date", sinceDate)
    .order("expense_date", { ascending: true });

  if (error || !expenses || expenses.length === 0) {
    console.log("[detect-subscriptions] No expenses to analyze", error);
    return 0;
  }

  // Group by (user_id, merchant)
  const groups = new Map<string, ExpenseGroup>();
  for (const exp of expenses) {
    const key = `${exp.created_by}|${exp.merchant}`;
    if (!groups.has(key)) {
      groups.set(key, {
        user_id: exp.created_by,
        merchant: exp.merchant!,
        amounts: [],
        dates: [],
        expense_ids: [],
      });
    }
    const group = groups.get(key)!;
    group.amounts.push(Number(exp.amount));
    group.dates.push(exp.expense_date);
    group.expense_ids.push(exp.id);
  }

  // Get existing subscriptions to avoid duplicates
  const { data: existingSubs } = await supabase
    .from("subscriptions")
    .select("user_id, merchant, status");

  const existingSet = new Set(
    (existingSubs ?? [])
      .filter((s) => s.status !== "dismissed")
      .map((s) => `${s.user_id}|${s.merchant}`)
  );

  let newCount = 0;

  for (const group of groups.values()) {
    // Need at least 2 entries to detect a pattern
    if (group.amounts.length < 2) continue;

    // Check amount consistency (within +/- 10%)
    if (!amountsAreConsistent(group.amounts)) continue;

    // Check date pattern
    const pattern = detectFrequency(group.dates);
    if (!pattern) continue;

    // Skip if subscription already exists for this user+merchant
    const subKey = `${group.user_id}|${group.merchant}`;
    if (existingSet.has(subKey)) continue;

    // Calculate average amount
    const avgAmount =
      Math.round(
        (group.amounts.reduce((s, a) => s + a, 0) / group.amounts.length) * 100
      ) / 100;

    const { error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: group.user_id,
        merchant: group.merchant,
        amount: avgAmount,
        frequency: pattern.frequency,
        next_expected: pattern.nextExpected,
        status: "suggested",
        source_expense_ids: group.expense_ids,
      });

    if (!insertError) {
      newCount++;
    } else {
      console.error(
        `[detect-subscriptions] Insert failed for ${group.merchant}:`,
        insertError
      );
    }
  }

  console.log(`[detect-subscriptions] Found ${newCount} new suggestions`);
  return newCount;
}
