"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const ZEN_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const CSS_EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";

/* ── Animated Eye Icon — crossfade between open & closed states ──
   Safari/WebKit doesn't support the CSS `d` property, so we render two
   concrete SVG states and animate only opacity and `r` (both supported
   everywhere). Result: identical behaviour in all browsers. */

const UPPER_OPEN = "M2 12 C5 6 9 3 12 3 C15 3 19 6 22 12";
const LOWER_OPEN = "M2 12 C5 18 9 21 12 21 C15 21 19 18 22 12";
const CLOSED_LID = "M2 12 C5 12.5 9 13 12 13 C15 13 19 12.5 22 12";

const LASHES = [
  { x1: 8, y1: 13, x2: 6.5, y2: 16 },
  { x1: 12, y1: 13.2, x2: 12, y2: 16.5 },
  { x1: 16, y1: 13, x2: 17.5, y2: 16 },
];

function EyeIcon({ isHidden, className = "" }: { isHidden: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeLinecap="round" strokeLinejoin="round">
      {/* Open state — upper + lower lids and iris */}
      <g
        style={{
          opacity: isHidden ? 0 : 1,
          transition: `opacity 0.25s ${CSS_EASE}`,
        }}
      >
        <path d={UPPER_OPEN} stroke="currentColor" strokeWidth="1.5" />
        <path d={LOWER_OPEN} stroke="currentColor" strokeWidth="1.5" />
        <circle
          cx="12"
          cy="12"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          style={{
            r: isHidden ? 0 : 2.5,
            transition: `r 0.3s ${CSS_EASE}`,
          } as React.CSSProperties}
        />
      </g>

      {/* Closed state — flat lid */}
      <path
        d={CLOSED_LID}
        stroke="currentColor"
        strokeWidth="1.5"
        style={{
          opacity: isHidden ? 1 : 0,
          transition: `opacity 0.25s ${CSS_EASE}`,
        }}
      />

      {/* Eyelash strokes — stagger in when closed */}
      {LASHES.map((l, i) => (
        <path
          key={i}
          d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`}
          stroke="currentColor"
          strokeWidth="1.5"
          style={{
            opacity: isHidden ? 0.5 : 0,
            transition: `opacity 0.25s ${CSS_EASE} ${isHidden ? 0.15 + i * 0.06 : 0}s`,
          }}
        />
      ))}
    </svg>
  );
}

/* ── Masked amount with crossfade ──────────────────────── */

function MaskedValue({
  hidden,
  children,
  delay = 0,
}: {
  hidden: boolean;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={hidden ? "h" : "v"}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.2, delay, ease: ZEN_EASE }}
        className="inline"
      >
        {hidden ? "• • •" : children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Component ─────────────────────────────────────────── */

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
  const [hidden, setHidden] = useState(false);

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
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-light text-ink-light">
          {monthName}
        </h2>
        <button
          onClick={() => setHidden((h) => !h)}
          className="-mr-2 rounded-lg p-2 text-ink-light/40 transition-colors hover:text-ink-light"
          aria-label={hidden ? "Show amounts" : "Hide amounts"}
        >
          <EyeIcon isHidden={hidden} className="h-5 w-5" />
        </button>
      </div>

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
                <MaskedValue hidden={hidden}>
                  {carryOver! >= 0 ? "+" : ""}
                  {carryOver!.toFixed(2)}
                </MaskedValue>{" "}
                <span className="text-[10px]">PLN</span>
              </span>
            </div>
          )}
          {hasIncome && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-sage">Income</span>
              <span className="font-number text-lg font-light tabular-nums tracking-tight text-sage">
                <MaskedValue hidden={hidden} delay={0.04}>
                  +{incomeTotal!.toFixed(2)}
                </MaskedValue>{" "}
                <span className="text-xs">PLN</span>
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-light">Expenses</span>
            <span className="font-number text-lg font-light tabular-nums tracking-tight">
              <MaskedValue hidden={hidden} delay={0.08}>
                -{total.toFixed(2)}
              </MaskedValue>{" "}
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
                  <MaskedValue hidden={hidden} delay={0.12}>
                    {balance!.toFixed(2)}
                  </MaskedValue>{" "}
                  <span className="font-body text-sm text-ink-light">PLN</span>
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 font-number text-4xl font-light tabular-nums tracking-tight">
          <MaskedValue hidden={hidden}>{total.toFixed(2)}</MaskedValue>{" "}
          <span className="font-body text-xl text-ink-light">PLN</span>
        </p>
      )}
    </section>
  );
}
