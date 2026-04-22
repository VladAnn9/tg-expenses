"use client";

import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { ZEN_EASE } from "@/lib/motion";

// Deterministic waveform heights — seeded sin + noise, 22 bars
const WAVE_HEIGHTS = Array.from({ length: 22 }, (_, i) => {
  const base = Math.sin(i * 0.7) * 0.5 + 0.5;
  const noise = Math.sin(i * 2.3) * 0.25;
  return Math.max(0.22, Math.min(1, base + noise));
});

export function UserBubble({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, delay, ease: ZEN_EASE }}
      className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-[#eeffde] px-3.5 py-2 text-[13px] text-ink shadow-[0_1px_2px_rgba(44,40,37,0.05)]"
    >
      {children}
    </motion.div>
  );
}

export function BotBubble({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, delay, ease: ZEN_EASE }}
      className="self-start max-w-[90%] rounded-2xl rounded-bl-md border border-sand/30 bg-cream px-3.5 py-2 text-[13px] text-ink shadow-[0_1px_2px_rgba(44,40,37,0.04)]"
    >
      {children}
    </motion.div>
  );
}

export function BotTyping() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: ZEN_EASE }}
      className="self-start rounded-2xl rounded-bl-md border border-sand/30 bg-cream px-4 py-3 shadow-[0_1px_2px_rgba(44,40,37,0.04)]"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-ink-light/60"
            style={{
              animation: "zen-bounce-dot 1.1s infinite",
              animationDelay: `${i * 160}ms`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function VoiceBubble({ duration = "0:04" }: { duration?: string }) {
  const [barsIn, setBarsIn] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setBarsIn(true), 120);
    const t2 = setTimeout(() => setSweeping(true), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: ZEN_EASE }}
      className="self-end flex max-w-[85%] items-center gap-2.5 rounded-2xl rounded-br-md bg-[#eeffde] px-3 py-2 shadow-[0_1px_2px_rgba(44,40,37,0.05)]"
    >
      <span
        aria-hidden
        className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/80"
      >
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-cream ml-[1px]">
          <polygon points="2,1 9,5 2,9" />
        </svg>
      </span>
      <div className="flex h-5 items-center gap-[2px]">
        {WAVE_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className="block w-[2px] rounded-full bg-ink/60 origin-center"
            style={{
              height: `${Math.round(h * 18 + 2)}px`,
              transform: barsIn ? "scaleY(1)" : "scaleY(0)",
              transition: `transform 220ms cubic-bezier(0.25,0.1,0.25,1) ${i * 20}ms`,
              animation: sweeping
                ? `zen-wave-sweep 1.8s ease-in-out ${i * 30}ms`
                : undefined,
            }}
          />
        ))}
      </div>
      <span className="font-[family-name:var(--font-number)] text-[11px] text-ink/70 tabular-nums">
        {duration}
      </span>
    </motion.div>
  );
}

export function CountUp({
  to,
  duration = 800,
  prefix = "",
  suffix = "",
  decimals = 2,
  className = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(to * t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return (
    <span className={`font-[family-name:var(--font-number)] tabular-nums ${className}`}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
