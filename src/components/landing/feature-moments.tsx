"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import AnimatedSection from "@/components/ui/animated-section";
import { ZEN_EASE } from "@/lib/motion";

type Feature = {
  numeral: string;
  heading: string;
  body: string;
  accent: ReactNode;
};

const HouseholdAccent = () => (
  <svg viewBox="0 0 44 32" className="h-8 w-11" aria-hidden>
    <ellipse
      cx="16"
      cy="16"
      rx="13"
      ry="13"
      fill="none"
      stroke="var(--sage)"
      strokeWidth="1.5"
      opacity="0.7"
    />
    <ellipse
      cx="28"
      cy="16"
      rx="13"
      ry="13"
      fill="none"
      stroke="var(--terracotta)"
      strokeWidth="1.5"
      opacity="0.6"
    />
  </svg>
);

const PieAccent = () => {
  // Mini pie-ring preview using the category palette
  const segments = [
    { color: "#8B9D83", pct: 0.26 }, // Food/sage
    { color: "#A67C52", pct: 0.18 }, // Dining
    { color: "#C07654", pct: 0.14 }, // Transport/terracotta
    { color: "#7A8B9D", pct: 0.11 }, // Travel/horizon
    { color: "#9C9A6E", pct: 0.09 }, // Sport/moss
    { color: "#D4C5B2", pct: 0.12 }, // Shopping/sand
    { color: "#6B6560", pct: 0.1 }, // Bills/ink-light
  ];
  const C = 2 * Math.PI * 14;
  let offset = 0;
  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9" aria-hidden>
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke="var(--sand)"
        strokeWidth="1"
        opacity="0.3"
      />
      {segments.map((s, i) => {
        const dash = s.pct * C;
        const el = (
          <circle
            key={i}
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={s.color}
            strokeWidth="4"
            strokeDasharray={`${dash} ${C}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 18 18)"
            strokeLinecap="butt"
          />
        );
        offset += dash + 1;
        return el;
      })}
    </svg>
  );
};

const KeyAccent = () => (
  <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
    <circle
      cx="11"
      cy="16"
      r="5"
      fill="none"
      stroke="var(--ink-light)"
      strokeWidth="1.5"
    />
    <path
      d="M16 16 L28 16 M24 16 L24 20 M28 16 L28 21"
      fill="none"
      stroke="var(--ink-light)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const FEATURES: Feature[] = [
  {
    numeral: "01",
    heading: "Shared, without fuss",
    body:
      "Invite one other person with a single link. Two phones, one ledger, no arguments about who paid for groceries.",
    accent: <HouseholdAccent />,
  },
  {
    numeral: "02",
    heading: "A dashboard that breathes",
    body:
      "Charts without grid lines. Figures in tabular Outfit. A week in one screen, a month in another, never more than a thumb-scroll away.",
    accent: <PieAccent />,
  },
  {
    numeral: "03",
    heading: "Yours, and only",
    body:
      "Row-level security on every table. No receipt images stored — only what you confirmed. No ads. No third parties. Free because it's ours, not because you are.",
    accent: <KeyAccent />,
  },
];

const PARALLAX_RATIOS = [0.04, 0.07, 0.05];

function Card({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [40 * PARALLAX_RATIOS[index], -40 * PARALLAX_RATIOS[index]],
  );

  return (
    <motion.article
      ref={ref}
      style={{ y }}
      className="relative flex h-full flex-col rounded-2xl border border-sand/30 bg-cream/50 p-7 md:p-8 backdrop-blur-[1px]"
    >
      <div className="flex items-start justify-between">
        <span
          className="font-display text-[clamp(72px,10vw,96px)] leading-none tracking-tight text-sand"
          style={{ fontWeight: 300 }}
        >
          {feature.numeral}
        </span>
        <span className="mt-2 opacity-80">{feature.accent}</span>
      </div>
      <h3 className="mt-5 font-display text-[24px] md:text-[26px] font-normal text-ink leading-tight">
        {feature.heading}
      </h3>
      <p className="mt-3 font-body text-[15.5px] leading-[1.7] text-ink-light">
        {feature.body}
      </p>
    </motion.article>
  );
}

export default function FeatureMoments() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10 pt-20 md:pt-28 pb-16 md:pb-24">
        <AnimatedSection>
          <h2
            className="text-center font-display italic font-light text-ink"
            style={{ fontSize: "clamp(28px, 4.4vw, 44px)" }}
          >
            Small things, kept quietly.
          </h2>
        </AnimatedSection>

        <div className="mt-14 md:mt-20 grid grid-cols-1 items-stretch gap-6 md:gap-8 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              className="h-full"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: ZEN_EASE }}
            >
              <Card feature={f} index={i} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
