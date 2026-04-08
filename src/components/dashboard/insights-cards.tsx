"use client";

import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

interface Insight {
  text: string;
  category: string;
  direction: "up" | "down" | "steady";
  percentage: number;
}

interface InsightsCardsProps {
  insights: Insight[];
}

export default function InsightsCards({ insights }: InsightsCardsProps) {
  if (insights.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-lg font-light text-ink-light">Insights</h2>
      <div className="mt-3 space-y-2">
        {insights.slice(0, 3).map((insight, i) => {
          const emoji =
            CATEGORY_EMOJI[insight.category as ExpenseCategory] ?? "📊";
          const arrow =
            insight.direction === "up"
              ? "↑"
              : insight.direction === "down"
                ? "↓"
                : "→";
          const color =
            insight.direction === "up"
              ? "text-terracotta"
              : insight.direction === "down"
                ? "text-sage"
                : "text-ink-light";

          return (
            <div
              key={i}
              className="rounded-xl border border-sand/30 bg-cream/30 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span>{emoji}</span>
                <span className={`text-sm font-medium ${color}`}>
                  {arrow} {insight.percentage}%
                </span>
                <span className="text-sm text-ink-light">
                  {insight.category}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-light">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
