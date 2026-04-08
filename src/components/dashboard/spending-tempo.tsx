"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

interface TempoCategory {
  category: string;
  subcategory?: string;
  amount: number;
}

interface TempoDataPoint {
  date: string;
  total: number;
  categories?: TempoCategory[];
}

interface SpendingTempoProps {
  data: TempoDataPoint[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: TempoDataPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-sand/30 bg-cream px-3 py-2 shadow-sm min-w-[140px]">
      <p className="text-xs text-ink-light">{point.date}</p>
      <p className="font-display text-sm font-medium text-ink">
        {point.total.toFixed(2)} PLN
      </p>
      {point.categories && point.categories.length > 0 && (
        <div className="mt-1.5 border-t border-sand/20 pt-1.5 space-y-0.5">
          {point.categories.slice(0, 5).map((cat, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-ink-light truncate">
                {CATEGORY_EMOJI[cat.category as ExpenseCategory] ?? "📊"}{" "}
                {cat.subcategory ? `${cat.category} > ${cat.subcategory}` : cat.category}
              </span>
              <span className="tabular-nums text-ink-light/70 flex-shrink-0">
                {cat.amount.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpendingTempo({ data }: SpendingTempoProps) {
  if (!data || data.length === 0) return null;

  return (
    <section className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
      <h3 className="mb-4 font-display text-lg font-light text-ink-light">
        Weekly Tempo
      </h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id="sageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B9D83" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B9D83" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#2C2825", opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: string) => {
                const parts = value.split("-");
                return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : value;
              }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#8B9D83"
              strokeWidth={2}
              fill="url(#sageGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
