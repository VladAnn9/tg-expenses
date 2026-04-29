"use client";

import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { LayoutGroup, motion } from "motion/react";
import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

const ZEN_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const CSS_EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";

/* ── Animated Sort Icon — morphs bar widths via stroke-dasharray ──
   Each bar is rendered at its full width and revealed up to the target
   length using stroke-dasharray. Safari doesn't support the CSS `d`
   property, but stroke-dasharray transitions are well-supported across
   all engines. */

const SORT_BARS = [
  { y: 7, amountX: 19, alphaX: 11 },
  { y: 12, amountX: 15, alphaX: 15 },
  { y: 17, amountX: 11, alphaX: 19 },
];

const BAR_START = 5;
const BAR_END = 19;

function SortIcon({ mode, className = "" }: { mode: "amount" | "alpha"; className?: string }) {
  const isAlpha = mode === "alpha";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeLinecap="round">
      {SORT_BARS.map((bar, i) => {
        const length = (isAlpha ? bar.alphaX : bar.amountX) - BAR_START;
        return (
          <path
            key={i}
            d={`M${BAR_START} ${bar.y} L${BAR_END} ${bar.y}`}
            stroke="currentColor"
            strokeWidth="2"
            style={{
              strokeDasharray: `${length} 100`,
              transition: `stroke-dasharray 0.35s ${CSS_EASE} ${i * 0.05}s`,
            }}
          />
        );
      })}
    </svg>
  );
}

/* ── Types & constants ─────────────────────────────────── */

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
  Travel: "#7A8B9D",
  Shopping: "#D4C5B2",
  Entertainment: "#A68B6B",
  Health: "#7A8B7A",
  Other: "#B0A090",
};

interface CategoryChartProps {
  data: CategoryData[];
}

/* ── Component ─────────────────────────────────────────── */

export default function CategoryChart({ data }: CategoryChartProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"amount" | "alpha">("amount");

  const activeCategories = useMemo(
    () => data.filter((d) => d.total > 0),
    [data],
  );

  const sortedCategories = useMemo(() => {
    const cats = [...activeCategories];
    return sortMode === "alpha"
      ? cats.sort((a, b) => a.category.localeCompare(b.category))
      : cats.sort((a, b) => b.total - a.total);
  }, [activeCategories, sortMode]);

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
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-light text-ink-light">
          Categories
        </h2>
        <button
          onClick={() =>
            setSortMode((m) => (m === "amount" ? "alpha" : "amount"))
          }
          className="-mr-2 rounded-lg p-2 text-ink-light/40 transition-colors hover:text-ink-light"
          aria-label={
            sortMode === "amount" ? "Sort alphabetically" : "Sort by amount"
          }
        >
          <SortIcon mode={sortMode} className="h-5 w-5" />
        </button>
      </div>

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

      {/* Legend with animated reorder */}
      <LayoutGroup>
        <div className="mt-4 space-y-1">
          {sortedCategories.map((item) => {
            const hasSubs =
              item.subcategories && item.subcategories.length > 0;
            const isExpanded = expandedCategory === item.category;

            return (
              <motion.div
                key={item.category}
                layout
                transition={{
                  layout: {
                    duration: 0.4,
                    ease: [0.25, 0.1, 0.25, 1],
                  },
                }}
              >
                <button
                  onClick={() =>
                    hasSubs
                      ? setExpandedCategory(
                          isExpanded ? null : item.category,
                        )
                      : undefined
                  }
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                    hasSubs
                      ? "cursor-pointer hover:bg-mist/30 active:bg-mist/50"
                      : "cursor-default"
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
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>
    </section>
  );
}
