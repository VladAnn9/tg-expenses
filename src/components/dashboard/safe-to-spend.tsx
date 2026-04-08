interface SafeToSpendProps {
  safeToSpend: number | null;
}

export default function SafeToSpend({ safeToSpend }: SafeToSpendProps) {
  if (safeToSpend == null) return null;

  const isPositive = safeToSpend >= 0;
  const colorClass = isPositive ? "text-sage" : "text-terracotta";

  return (
    <section className="rounded-xl border border-sand/30 bg-cream/30 p-5">
      <p className="text-sm text-ink-light">Safe to Spend</p>
      <p className={`mt-1 font-number text-2xl font-light tabular-nums ${colorClass}`}>
        {safeToSpend.toFixed(2)}
        <span className="ml-1 font-body text-sm text-ink-light">PLN</span>
      </p>
      <p className="mt-1 text-xs text-ink-light">
        {isPositive
          ? "Remaining after subscriptions and expenses this month"
          : "You've exceeded your income this month"}
      </p>
    </section>
  );
}
