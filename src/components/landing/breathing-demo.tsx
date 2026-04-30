"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ZEN_EASE } from "@/lib/motion";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { BotBubble, BotTyping, CountUp, UserBubble, VoiceBubble } from "./chat-bubble";

type Phase =
  | "idle"
  | "voice"
  | "transcribing"
  | "parsed"
  | "confirm"
  | "saved"
  | "fading";

type Round = {
  voice: string;
  merchant: string;
  category: string;
  emoji: string;
  amount: number;
  monthlyTotal: number;
};

const ROUNDS: Round[] = [
  {
    voice: "forty-two zlotys at Żabka, bread and milk",
    merchant: "Żabka",
    category: "Food",
    emoji: "🛒",
    amount: 42.0,
    monthlyTotal: 342,
  },
  {
    voice: "eighteen for coffee at Costa",
    merchant: "Costa",
    category: "Dining",
    emoji: "🍽️",
    amount: 18.0,
    monthlyTotal: 186,
  },
  {
    voice: "ninety on the Uber home",
    merchant: "Uber",
    category: "Transport",
    emoji: "🚗",
    amount: 90.0,
    monthlyTotal: 420,
  },
  {
    voice: "four-fifty on a flight to Berlin",
    merchant: "LOT",
    category: "Travel",
    emoji: "✈️",
    amount: 450.0,
    monthlyTotal: 1280,
  },
  {
    voice: "one-twenty on the gym membership",
    merchant: "Zdrofit",
    category: "Sport",
    emoji: "🏃",
    amount: 120.0,
    monthlyTotal: 540,
  },
];

const TIMELINE = {
  voice: 300,
  transcribing: 2600,
  parsed: 4200,
  confirm: 5400,
  saved: 5900,
  fade: 9300,
  next: 9900,
} as const;

interface BreathingDemoProps {
  /** If provided, forces this round and replays it from the start on change. */
  round?: number;
  /** Pause the loop (e.g., when off-screen). */
  paused?: boolean;
  /** "hero" = compact (340px wide), "feature" = larger. */
  size?: "hero" | "feature";
}

export default function BreathingDemo({
  round: roundProp,
  paused = false,
  size = "hero",
}: BreathingDemoProps) {
  const reduced = useReducedMotion();
  const [internalRound, setInternalRound] = useState(0);
  const round = roundProp ?? internalRound;
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  // Run the choreography whenever round changes or when unpaused.
  useEffect(() => {
    if (reduced || paused) return;

    const schedule = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms));
    };

    schedule(0, () => setPhase("idle"));
    schedule(TIMELINE.voice, () => setPhase("voice"));
    schedule(TIMELINE.transcribing, () => setPhase("transcribing"));
    schedule(TIMELINE.parsed, () => setPhase("parsed"));
    schedule(TIMELINE.confirm, () => setPhase("confirm"));
    schedule(TIMELINE.saved, () => setPhase("saved"));
    schedule(TIMELINE.fade, () => setPhase("fading"));

    if (roundProp === undefined) {
      schedule(TIMELINE.next, () => {
        setInternalRound((r) => (r + 1) % ROUNDS.length);
      });
    }

    return clearTimers;
  }, [round, roundProp, paused, reduced]);

  const r = ROUNDS[round] ?? ROUNDS[0];
  const effectivePhase: Phase = reduced ? "saved" : phase;

  const showVoice = effectivePhase !== "idle" && effectivePhase !== "fading";
  const showTyping = effectivePhase === "transcribing";
  const showParsed =
    effectivePhase === "parsed" ||
    effectivePhase === "confirm" ||
    effectivePhase === "saved";
  const showConfirm =
    effectivePhase === "confirm" || effectivePhase === "saved";
  const showSaved = effectivePhase === "saved";

  const frameClass =
    size === "hero"
      ? "w-full max-w-[340px] h-[520px] md:h-[560px]"
      : "w-full max-w-[400px] h-[560px] md:h-[600px]";

  return (
    <div
      aria-hidden
      className={`relative ${frameClass} rounded-[28px] border border-sand/40 bg-cream/85 shadow-[0_30px_80px_-20px_rgba(44,40,37,0.18)] backdrop-blur-[2px] overflow-hidden flex flex-col`}
    >
      {/* Speaker grill inset */}
      <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-14 -translate-x-1/2 rounded-full bg-ink/10" />

      {/* Header */}
      <div className="mt-5 mx-4 pb-3 flex items-center gap-3 border-b border-sand/30">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0088cc] font-[family-name:var(--font-cormorant)] text-[15px] font-medium text-cream"
          aria-hidden
        >
          Z
        </div>
        <div className="flex flex-col">
          <span className="font-body text-[13px] font-medium text-ink leading-tight">
            Zen Finance Bot
          </span>
          <span className="text-[10px] text-sage leading-tight">online</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-h-0 overflow-hidden px-3 py-3 flex flex-col justify-end gap-1.5">
        <AnimatePresence mode="sync">
          {showVoice && <VoiceBubble key={`voice-${round}`} />}

          {showTyping && <BotTyping key={`typing-${round}`} />}

          {showParsed && (
            <BotBubble key={`parsed-${round}`}>
              <div className="flex flex-col gap-1.5">
                <div className="italic text-ink-light text-[12px] leading-snug">
                  I heard: &ldquo;{r.voice}&rdquo;
                </div>
                <div className="flex items-center gap-1.5 text-[12px]">
                  <span>{r.emoji}</span>
                  <span className="font-medium">{r.category}</span>
                  <span className="text-ink-light">·</span>
                  <span className="text-ink-light">{r.merchant}</span>
                </div>
                <div className="font-[family-name:var(--font-number)] text-[16px] font-medium tabular-nums">
                  {showParsed && !showSaved ? (
                    <CountUp to={r.amount} duration={800} suffix=" PLN" />
                  ) : (
                    `${r.amount.toFixed(2)} PLN`
                  )}
                </div>
                {!showSaved && (
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-md border border-sand/60 bg-cream px-2 py-0.5 text-[11px] text-ink"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-md border border-sand/60 bg-cream px-2 py-0.5 text-[11px] text-ink-light"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-md border border-sand/60 bg-cream px-2 py-0.5 text-[11px] text-ink-light"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            </BotBubble>
          )}

          {showConfirm && (
            <UserBubble key={`confirm-${round}`} delay={0.04}>
              Yes
            </UserBubble>
          )}

          {showSaved && (
            <BotBubble key={`saved-${round}`} delay={0.08}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[12px]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="var(--sage)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M4 12l5 5L20 7"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, ease: ZEN_EASE }}
                    />
                  </svg>
                  <span>Saved to your ledger.</span>
                </div>
                <div className="italic text-[11px] text-ink-light">
                  Monthly {r.category}:{" "}
                  <CountUp
                    to={r.monthlyTotal}
                    duration={700}
                    decimals={0}
                    suffix=" PLN"
                  />
                </div>
              </div>
            </BotBubble>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
