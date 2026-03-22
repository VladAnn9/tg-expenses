import { createClient } from "@/lib/supabase/server";
import TelegramLink from "@/components/telegram-link";
import SpendingSummary from "@/components/dashboard/spending-summary";
import CategoryChart from "@/components/dashboard/category-chart";
import RecentExpenses from "@/components/dashboard/recent-expenses";
import AnimatedSection from "@/components/ui/animated-section";
import { CATEGORIES } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_id")
    .eq("id", user!.id)
    .single<{ telegram_id: number | null }>();

  const hasTelegram = !!profile?.telegram_id;

  // Current month data
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate =
    monthNum === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, category")
    .eq("created_by", user!.id)
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

  const { data: recent } = await supabase
    .from("expenses")
    .select("id, amount, category, merchant, expense_date, note")
    .eq("created_by", user!.id)
    .order("expense_date", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      {!hasTelegram && (
        <AnimatedSection delay={0}>
          <div className="rounded-2xl border border-sand/50 bg-cream p-6 text-center shadow-sm">
            <p className="font-display text-xl font-light">
              Connect Telegram to start tracking
            </p>
            <p className="mt-2 text-sm text-ink-light">
              Log expenses by voice, photo, or text — right from Telegram
            </p>
            <TelegramLink />
          </div>
        </AnimatedSection>
      )}

      <AnimatedSection delay={0.1}>
        <SpendingSummary total={total} month={month} />
      </AnimatedSection>
      <AnimatedSection delay={0.2}>
        <CategoryChart data={byCategory} />
      </AnimatedSection>
      <AnimatedSection delay={0.3}>
        <RecentExpenses expenses={(recent ?? []) as Parameters<typeof RecentExpenses>[0]["expenses"]} />
      </AnimatedSection>
    </div>
  );
}
