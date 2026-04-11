"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

interface SubcategoryData {
  name: string;
  total: number;
  count: number;
}

export interface CategoryData {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
  subcategories?: SubcategoryData[];
}

const COLORS: Record<ExpenseCategory, string> = {
  Food: "#8B9D83",
  Dining: "#A67C52",
  Housing: "#8A7B6B",
  Bills: "#6B6560",
  Transport: "#C07654",
  Shopping: "#D4C5B2",
  Entertainment: "#A68B6B",
  Health: "#7A8B7A",
  Other: "#B0A090",
};

interface CategoryChartProps {
  data: CategoryData[];
}

export default function CategoryChart({ data }: CategoryChartProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
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

      {/* Legend with expandable subcategories */}
      <div className="mt-4 space-y-1">
        {activeCategories.map((item) => {
          const hasSubs = item.subcategories && item.subcategories.length > 0;
          const isExpanded = expandedCategory === item.category;

          return (
            <div key={item.category}>
              <button
                onClick={() =>
                  hasSubs
                    ? setExpandedCategory(isExpanded ? null : item.category)
                    : undefined
                }
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                  hasSubs ? "hover:bg-mist/30 active:bg-mist/50 cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[item.category] }}
                  />
                  <span className="text-sm">
                    {CATEGORY_EMOJI[item.category]} {item.category}
                  </span>
                  {hasSubs && (
                    <span className="text-xs text-ink-light/50">
                      {isExpanded ? "▴" : "▾"}
                    </span>
                  )}
                </div>
                <span className="font-number tabular-nums text-sm text-ink-light">
                  {item.total.toFixed(0)} PLN
                  <span className="ml-1 text-xs">({item.percentage}%)</span>
                </span>
              </button>

              {/* Subcategory breakdown */}
              {isExpanded && item.subcategories && (
                <div className="ml-5 mt-0.5 mb-1 space-y-0.5 border-l-2 border-sand/30 pl-3">
                  {item.subcategories.map((sub) => (
                    <div
                      key={sub.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-ink-light">{sub.name}</span>
                      <span className="tabular-nums text-ink-light/70">
                        {sub.total.toFixed(0)} PLN
                        <span className="ml-1 text-[10px]">
                          ({sub.count})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
