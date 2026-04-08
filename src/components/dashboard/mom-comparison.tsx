"use client";

interface MoMComparisonProps {
  paceProjection: number;
  previousMonthTotal: number;
}

export default function MoMComparison({
  paceProjection,
  previousMonthTotal,
}: MoMComparisonProps) {
  const diff = previousMonthTotal > 0
    ? ((paceProjection - previousMonthTotal) / previousMonthTotal) * 100
    : 0;
  const isHigher = paceProjection > previousMonthTotal;
  const isLower = paceProjection < previousMonthTotal;

  return (
    <section className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
      <h3 className="mb-3 font-display text-lg font-light text-ink-light">
        Month-over-Month
      </h3>

      <p className="text-sm text-ink">
        At this pace,{" "}
        <span className="font-number font-medium tabular-nums">
          ~{paceProjection.toFixed(0)} PLN
        </span>{" "}
        by month end
      </p>

      <p className="mt-1 text-sm text-ink-light">
        Last month:{" "}
        <span className="font-number font-medium tabular-nums text-ink">
          {previousMonthTotal.toFixed(0)} PLN
        </span>
      </p>

      {previousMonthTotal > 0 && (
        <div className="mt-3 flex items-center gap-2">
          {isHigher ? (
            <svg
              className="h-4 w-4 text-terracotta"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 15l7-7 7 7"
              />
            </svg>
          ) : isLower ? (
            <svg
              className="h-4 w-4 text-sage"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          ) : null}
          <span
            className={`text-sm font-medium ${
              isHigher
                ? "text-terracotta"
                : isLower
                  ? "text-sage"
                  : "text-ink-light"
            }`}
          >
            {Math.abs(diff).toFixed(1)}%{" "}
            {isHigher ? "higher" : isLower ? "lower" : "same"}
          </span>
        </div>
      )}
    </section>
  );
}
