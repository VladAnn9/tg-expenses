"use client";

import { useState, useEffect } from "react";
import TelegramLink from "@/components/telegram-link";
import SpendingSummary from "@/components/dashboard/spending-summary";
import CategoryChart from "@/components/dashboard/category-chart";
import RecentExpenses from "@/components/dashboard/recent-expenses";
import SafeToSpend from "@/components/dashboard/safe-to-spend";
import SpendingTempo from "@/components/dashboard/spending-tempo";
import MomComparison from "@/components/dashboard/mom-comparison";
import InsightsCards from "@/components/dashboard/insights-cards";
import AnimatedSection from "@/components/ui/animated-section";
import AnimatedContent from "@/components/ui/animated-content";

interface SummaryData {
  month: string;
  total: number;
  income_total: number;
  carry_over: number;
  balance: number;
  safe_to_spend: number | null;
  pace_projection: number;
  previous_month_total: number;
  by_category: { category: string; total: number; count: number; percentage: number }[];
  recent_expenses: { id: string; amount: number; category: string; merchant: string | null; expense_date: string; note: string | null; created_by?: string }[];
  tempo: { date: string; total: number }[];
}

interface Insight {
  text: string;
  category: string;
  direction: "up" | "down" | "steady";
  percentage: number;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [hasTelegram, setHasTelegram] = useState(true);
  const [loading, setLoading] = useState(true);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const isCurrentMonth = month === getCurrentMonth();

  const [year, monthNum] = month.split("-").map(Number);
  const monthName = new Date(year, monthNum - 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    if (isCurrentMonth) return;
    const d = new Date(year, monthNum, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // Fetch settings + available months once
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings) => setHasTelegram(settings.telegram_linked ?? true));
    fetch("/api/months")
      .then((r) => r.json())
      .then((data) => setAvailableMonths(data.months ?? []))
      .catch(() => {});
  }, []);

  // Fetch summary on every month change (including initial)
  useEffect(() => {
    fetch(`/api/summary?month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        setSummary(data);
        setLoading(false);
      });
  }, [month]);

  // Insights — only for current month
  useEffect(() => {
    if (isCurrentMonth) {
      setInsights(null);
      fetch(`/api/insights?month=${month}`)
        .then((r) => r.json())
        .then((data) => setInsights(data.insights ?? []))
        .catch(() => setInsights([]));
    } else {
      setInsights([]);
    }
  }, [month, isCurrentMonth]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-mist/50" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-8">
      {/* Month navigation */}
      <AnimatedSection>
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="rounded-lg px-3 py-2 text-ink-light transition-colors hover:bg-mist/50 hover:text-ink active:scale-95"
          >
            ← Prev
          </button>
          <div className="relative">
            <AnimatedContent transitionKey={month}>
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="font-display text-xl font-light transition-colors hover:text-sage"
              >
                {monthName}
                <span className="ml-1.5 inline-block text-xs text-ink-light">
                  ▾
                </span>
              </button>
            </AnimatedContent>
            {showMonthPicker && availableMonths.length > 1 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMonthPicker(false)}
                />
                <div className="absolute left-1/2 top-full z-20 mt-2 max-h-64 w-48 -translate-x-1/2 overflow-y-auto rounded-xl border border-sand/50 bg-cream py-1 shadow-lg">
                  {availableMonths.map((m) => {
                    const [y, mn] = m.split("-").map(Number);
                    const label = new Date(y, mn - 1).toLocaleString("en", {
                      month: "long",
                      year: "numeric",
                    });
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setMonth(m);
                          setShowMonthPicker(false);
                        }}
                        className={`flex w-full px-4 py-2 text-left text-sm transition-colors ${
                          m === month
                            ? "bg-sage/10 text-sage font-medium"
                            : "text-ink hover:bg-mist/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={`rounded-lg px-3 py-2 transition-colors active:scale-95 ${
              isCurrentMonth
                ? "text-sand cursor-default"
                : "text-ink-light hover:bg-mist/50 hover:text-ink"
            }`}
          >
            Next →
          </button>
        </div>
      </AnimatedSection>

      {/* Widgets — crossfade on month change */}
      <AnimatedContent transitionKey={summary.month} className="space-y-8">
        {/* Telegram CTA — current month only */}
        {isCurrentMonth && !hasTelegram && (
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

        {/* Spending Summary (income/expense/net) */}
        <AnimatedSection delay={0.05}>
          <SpendingSummary
            total={summary.total}
            month={summary.month}
            incomeTotal={summary.income_total}
            carryOver={summary.carry_over}
            balance={summary.balance}
          />
        </AnimatedSection>

        {/* Safe to Spend — current month only */}
        {isCurrentMonth && (
          <AnimatedSection delay={0.1}>
            <SafeToSpend safeToSpend={summary.safe_to_spend} />
          </AnimatedSection>
        )}

        {/* Weekly Tempo Sparkline — current month only */}
        {isCurrentMonth && summary.tempo && summary.tempo.length > 0 && (
          <AnimatedSection delay={0.15}>
            <SpendingTempo data={summary.tempo} />
          </AnimatedSection>
        )}

        {/* Category Chart */}
        <AnimatedSection delay={0.2}>
          <CategoryChart data={summary.by_category as Parameters<typeof CategoryChart>[0]["data"]} />
        </AnimatedSection>

        {/* MoM Comparison */}
        {(isCurrentMonth ? summary.pace_projection > 0 : summary.total > 0) && (
          <AnimatedSection delay={0.25}>
            <MomComparison
              paceProjection={isCurrentMonth ? summary.pace_projection : summary.total}
              previousMonthTotal={summary.previous_month_total}
            />
          </AnimatedSection>
        )}

        {/* Insight Cards — current month only, loads independently */}
        {isCurrentMonth && (
          insights === null ? (
            <AnimatedSection delay={0.3}>
              <div className="space-y-2">
                <div className="h-5 w-24 animate-pulse rounded bg-mist/50" />
                <div className="h-16 animate-pulse rounded-xl bg-mist/50" />
              </div>
            </AnimatedSection>
          ) : insights.length > 0 ? (
            <AnimatedSection delay={0.3}>
              <InsightsCards insights={insights} />
            </AnimatedSection>
          ) : null
        )}

        {/* Recent Expenses */}
        <AnimatedSection delay={0.35}>
          <RecentExpenses expenses={summary.recent_expenses as Parameters<typeof RecentExpenses>[0]["expenses"]} />
        </AnimatedSection>
      </AnimatedContent>
    </div>
  );
}
