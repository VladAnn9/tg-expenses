import { createAdminClient } from "@/lib/supabase/admin";
import { getBot } from "@/lib/telegram/bot";
import { generateRoast } from "@/lib/ai/gemini";
import { getHouseholdMemberIds } from "@/lib/supabase/household";
import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

interface GroupSummaryData {
  thisWeek: Array<{ amount: number; category: string }>;
  lastWeekTotal: number;
}

export async function sendWeeklySummaries(): Promise<number> {
  const supabase = createAdminClient();
  const bot = getBot();

  // ── Phase 1: Fetch all profiles with telegram_id ──
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, telegram_id, roast_enabled, household_id")
    .not("telegram_id", "is", null);

  if (error || !profiles || profiles.length === 0) {
    console.log("[weekly-summary] No profiles with telegram_id");
    return 0;
  }

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeekStart = weekAgo.toISOString().split("T")[0];
  const thisWeekEnd = now.toISOString().split("T")[0];
  const lastWeekStart = twoWeeksAgo.toISOString().split("T")[0];
  const dateRange = `${thisWeekStart} - ${thisWeekEnd}`;

  // ── Group profiles by household ──
  const groups = new Map<string, typeof profiles>();
  for (const profile of profiles) {
    const key = profile.household_id ?? profile.id;
    const group = groups.get(key) ?? [];
    group.push(profile);
    groups.set(key, group);
  }

  // ── Phase 2: Fetch expense data per household group (parallel) ──
  const groupEntries = Array.from(groups.entries());
  const dataResults = await Promise.allSettled(
    groupEntries.map(async ([, members]) => {
      const memberIds = await getHouseholdMemberIds(supabase, members[0].id);

      const [thisWeekResult, lastWeekResult] = await Promise.all([
        supabase
          .from("expenses")
          .select("amount, category")
          .in("created_by", memberIds)
          .gte("expense_date", thisWeekStart)
          .lte("expense_date", thisWeekEnd),
        supabase
          .from("expenses")
          .select("amount")
          .in("created_by", memberIds)
          .gte("expense_date", lastWeekStart)
          .lt("expense_date", thisWeekStart),
      ]);

      const thisWeek = (thisWeekResult.data ?? []).map((e) => ({
        amount: Number(e.amount),
        category: e.category,
      }));
      const lastWeekTotal = (lastWeekResult.data ?? []).reduce(
        (s, e) => s + Number(e.amount),
        0,
      );

      return { members, data: { thisWeek, lastWeekTotal } as GroupSummaryData };
    }),
  );

  // ── Phase 3: Build messages and send (parallel per recipient) ──
  const sendTasks: Array<{
    profile: (typeof profiles)[number];
    data: GroupSummaryData;
  }> = [];

  for (const result of dataResults) {
    if (result.status === "rejected") {
      console.error("[weekly-summary] Group data fetch failed:", result.reason);
      continue;
    }
    for (const profile of result.value.members) {
      sendTasks.push({ profile, data: result.value.data });
    }
  }

  const sendResults = await Promise.allSettled(
    sendTasks.map(async ({ profile, data }) => {
      const telegramId = profile.telegram_id!;
      const { thisWeek, lastWeekTotal } = data;

      if (thisWeek.length === 0) {
        await bot.api.sendMessage(telegramId, "Quiet week \u2014 zero expenses logged.");
        return;
      }

      const total = thisWeek.reduce((s, e) => s + e.amount, 0);

      const categoryTotals = new Map<string, number>();
      for (const e of thisWeek) {
        categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount);
      }

      let topCategory = "Other";
      let topCategoryTotal = 0;
      for (const [cat, catTotal] of categoryTotals) {
        if (catTotal > topCategoryTotal) {
          topCategory = cat;
          topCategoryTotal = catTotal;
        }
      }

      const topPct = total > 0 ? Math.round((topCategoryTotal / total) * 100) : 0;
      const emoji = CATEGORY_EMOJI[topCategory as ExpenseCategory] ?? "\uD83D\uDCE6";

      let comparisonLine: string;
      if (lastWeekTotal === 0) {
        comparisonLine = "vs last week: no data";
      } else {
        const changePct = Math.round(((total - lastWeekTotal) / lastWeekTotal) * 100);
        const arrow = changePct > 0 ? "\u2B06\uFE0F" : changePct < 0 ? "\u2B07\uFE0F" : "\u27A1\uFE0F";
        comparisonLine = `vs last week: ${arrow} ${Math.abs(changePct)}% (was ${lastWeekTotal.toFixed(2)} PLN)`;
      }

      let message =
        `\uD83D\uDCCA Weekly Summary (${dateRange})\n\n` +
        `Total: ${total.toFixed(2)} PLN\n` +
        `Top: ${emoji} ${topCategory} \u2014 ${topPct}% (${topCategoryTotal.toFixed(2)} PLN)\n` +
        comparisonLine;

      if (profile.roast_enabled) {
        const roast = await generateRoast({
          amount: total,
          category: topCategory,
          subcategory: null,
          merchant: null,
          monthCategoryTotal: topCategoryTotal,
          avgCategory: lastWeekTotal > 0 ? lastWeekTotal : total,
        });
        if (roast) {
          message += `\n\n"${roast}"`;
        }
      }

      await bot.api.sendMessage(telegramId, message);
    }),
  );

  const sentCount = sendResults.filter((r) => r.status === "fulfilled").length;

  for (let i = 0; i < sendResults.length; i++) {
    if (sendResults[i].status === "rejected") {
      console.error(
        `[weekly-summary] Failed for profile ${sendTasks[i].profile.id}:`,
        (sendResults[i] as PromiseRejectedResult).reason,
      );
    }
  }

  console.log(`[weekly-summary] Sent ${sentCount} summaries`);
  return sentCount;
}
