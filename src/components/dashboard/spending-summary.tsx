"use client";

interface SpendingSummaryProps {
  total: number;
  month: string;
  incomeTotal?: number;
  carryOver?: number;
  balance?: number;
}

export default function SpendingSummary({
  total,
  month,
  incomeTotal,
  carryOver,
  balance,
}: SpendingSummaryProps) {
  const [year, monthNum] = month.split("-").map(Number);
  const monthName = new Date(year, monthNum - 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const hasIncome = incomeTotal != null && incomeTotal > 0;
  const hasCarryOver = carryOver != null && carryOver !== 0;
  const hasBalance = balance != null;

  return (
    <section className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
      <h2 className="font-display text-lg font-light text-ink-light">
        {monthName}
      </h2>

      {hasIncome || hasCarryOver || hasBalance ? (
        <div className="mt-3 space-y-1.5">
          {hasCarryOver && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-ink-light/60">Carry-over</span>
              <span
                className={`font-number text-sm font-light tabular-nums tracking-tight ${
                  carryOver! >= 0 ? "text-ink-light/60" : "text-terracotta/60"
                }`}
              >
                {carryOver! >= 0 ? "+" : ""}
                {carryOver!.toFixed(2)}{" "}
                <span className="text-[10px]">PLN</span>
              </span>
            </div>
          )}
          {hasIncome && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-sage">Income</span>
              <span className="font-number text-lg font-light tabular-nums tracking-tight text-sage">
                +{incomeTotal!.toFixed(2)}{" "}
                <span className="text-xs">PLN</span>
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-light">Expenses</span>
            <span className="font-number text-lg font-light tabular-nums tracking-tight">
              -{total.toFixed(2)}{" "}
              <span className="text-xs text-ink-light">PLN</span>
            </span>
          </div>
          {hasBalance && (
            <div className="border-t border-sand/30 pt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-light">Balance</span>
                <span
                  className={`font-number text-3xl font-light tabular-nums tracking-tight ${
                    balance! >= 0 ? "text-sage" : "text-terracotta"
                  }`}
                >
                  {balance!.toFixed(2)}{" "}
                  <span className="font-body text-sm text-ink-light">PLN</span>
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 font-number text-4xl font-light tabular-nums tracking-tight">
          {total.toFixed(2)} <span className="font-body text-xl text-ink-light">PLN</span>
        </p>
      )}
    </section>
  );
}
