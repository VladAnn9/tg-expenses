"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

interface CategoryData {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

const COLORS: Record<ExpenseCategory, string> = {
  Food: "#8B9D83",
  Transport: "#C07654",
  Shopping: "#D4C5B2",
  Bills: "#6B6560",
  Entertainment: "#A68B6B",
  Health: "#7A8B7A",
  Other: "#B0A090",
};

interface CategoryChartProps {
  data: CategoryData[];
}

export default function CategoryChart({ data }: CategoryChartProps) {
  const activeCategories = data.filter((d) => d.total > 0);

  if (activeCategories.length === 0) {
    return (
      <section className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
        <h2 className="font-display text-lg font-light text-ink-light">
          Categories
        </h2>
        <p className="mt-4 text-center text-sm text-ink-light">
          No expenses yet. Start logging to see your breakdown.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
      <h2 className="font-display text-lg font-light text-ink-light">
        Categories
      </h2>

      {/* Chart centered */}
      <div className="mx-auto mt-4 h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeCategories}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              strokeWidth={2}
              stroke="#FAF7F4"
            >
              {activeCategories.map((entry) => (
                <Cell key={entry.category} fill={COLORS[entry.category]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `${Number(value).toFixed(2)} PLN`}
              contentStyle={{
                background: "#FAF7F4",
                border: "1px solid #D4C5B2",
                borderRadius: "12px",
                fontSize: "13px",
                padding: "6px 10px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend below — compact rows */}
      <div className="mt-4 space-y-1.5">
        {activeCategories.map((item) => (
          <div
            key={item.category}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[item.category] }}
              />
              <span className="text-sm">
                {CATEGORY_EMOJI[item.category]} {item.category}
              </span>
            </div>
            <span className="tabular-nums text-sm text-ink-light">
              {item.total.toFixed(0)} PLN
              <span className="ml-1 text-xs">({item.percentage}%)</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
