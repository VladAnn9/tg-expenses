import { createAdminClient } from "@/lib/supabase/admin";
import { getBot } from "@/lib/telegram/bot";
import { generateRoast } from "@/lib/ai/gemini";
import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

export async function sendWeeklySummaries(): Promise<number> {
  const supabase = createAdminClient();
  const bot = getBot();

  // Get all profiles with telegram_id
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, telegram_id, roast_enabled")
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

  let sentCount = 0;

  for (const profile of profiles) {
    try {
      // This week's expenses
      const { data: thisWeekExpenses } = await supabase
        .from("expenses")
        .select("amount, category")
        .eq("created_by", profile.id)
        .gte("expense_date", thisWeekStart)
        .lte("expense_date", thisWeekEnd);

      const telegramId = profile.telegram_id!;
      const thisWeek = thisWeekExpenses ?? [];

      if (thisWeek.length === 0) {
        await bot.api.sendMessage(
          telegramId,
          "Quiet week \u2014 zero expenses logged."
        );
        sentCount++;
        continue;
      }

      const total = thisWeek.reduce((s, e) => s + Number(e.amount), 0);

      // Find top category
      const categoryTotals = new Map<string, number>();
      for (const e of thisWeek) {
        const cat = e.category;
        categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + Number(e.amount));
      }

      let topCategory = "Other";
      let topCategoryTotal = 0;
      for (const [cat, catTotal] of categoryTotals) {
        if (catTotal > topCategoryTotal) {
          topCategory = cat;
          topCategoryTotal = catTotal;
        }
      }

      const topPct =
        total > 0 ? Math.round((topCategoryTotal / total) * 100) : 0;
      const emoji =
        CATEGORY_EMOJI[topCategory as ExpenseCategory] ?? "\uD83D\uDCE6";

      // Last week's expenses for comparison
      const { data: lastWeekExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("created_by", profile.id)
        .gte("expense_date", lastWeekStart)
        .lt("expense_date", thisWeekStart);

      const lastWeekTotal = (lastWeekExpenses ?? []).reduce(
        (s, e) => s + Number(e.amount),
        0
      );

      let comparisonLine: string;
      if (lastWeekTotal === 0) {
        comparisonLine = "vs last week: no data";
      } else {
        const changePct = Math.round(
          ((total - lastWeekTotal) / lastWeekTotal) * 100
        );
        const arrow = changePct > 0 ? "\u2B06\uFE0F" : changePct < 0 ? "\u2B07\uFE0F" : "\u27A1\uFE0F";
        comparisonLine = `vs last week: ${arrow} ${Math.abs(changePct)}% (was ${lastWeekTotal.toFixed(2)} PLN)`;
      }

      let message =
        `\uD83D\uDCCA Weekly Summary (${dateRange})\n\n` +
        `Total: ${total.toFixed(2)} PLN\n` +
        `Top: ${emoji} ${topCategory} \u2014 ${topPct}% (${topCategoryTotal.toFixed(2)} PLN)\n` +
        comparisonLine;

      // Roast if enabled
      if (profile.roast_enabled) {
        try {
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
        } catch {
          // Roast is optional, continue without it
        }
      }

      await bot.api.sendMessage(telegramId, message);
      sentCount++;
    } catch (err) {
      console.error(
        `[weekly-summary] Failed for profile ${profile.id}:`,
        err
      );
    }
  }

  console.log(`[weekly-summary] Sent ${sentCount} summaries`);
  return sentCount;
}
