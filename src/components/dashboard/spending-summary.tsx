"use client";

interface SpendingSummaryProps {
  total: number;
  month: string;
}

export default function SpendingSummary({ total, month }: SpendingSummaryProps) {
  const [year, monthNum] = month.split("-").map(Number);
  const monthName = new Date(year, monthNum - 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
      <h2 className="font-display text-lg font-light text-ink-light">
        {monthName}
      </h2>
      <p className="mt-2 font-display text-4xl font-light tracking-tight">
        {total.toFixed(2)} <span className="text-xl text-ink-light">PLN</span>
      </p>
    </section>
  );
}
