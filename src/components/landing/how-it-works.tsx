"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ZEN_EASE } from "@/lib/motion";
import AnimatedSection from "@/components/ui/animated-section";
import BreathingDemo from "./breathing-demo";
import WordStagger from "./word-stagger";

type Moment = {
  numeral: string;
  tag: string;
  body: string;
};

const MOMENTS: Moment[] = [
  {
    numeral: "I",
    tag: "Voice",
    body:
      "Send a voice note the way you'd leave yourself one. “Forty-two zlotys at Żabka, bread and milk.” Groq Whisper transcribes. Gemini pulls the number, the merchant, the category. The bot reads it back for a nod of approval before anything is saved.",
  },
  {
    numeral: "II",
    tag: "Photo",
    body:
      "Snap the receipt in your palm before it crumples into your pocket. Gemini Flash reads the total and the vendor out of the creased paper. If it guessed the category wrong, you correct it in one tap.",
  },
  {
    numeral: "III",
    tag: "Text",
    body:
      "When your hands are on the keyboard anyway: “18 PLN coffee Costa”. Three words, one line. The same confirmation, the same ledger.",
  },
];

function MomentBlock({
  moment,
  index,
  onActive,
}: {
  moment: Moment;
  index: number;
  onActive: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6, margin: "-10% 0px -10% 0px" });

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: ZEN_EASE, delay: 0.05 }}
      className="py-14 md:py-28 first:pt-0 last:pb-0"
    >
      <div className="flex items-baseline gap-3 text-[12px] tracking-[0.18em] text-ink-light uppercase">
        <span className="font-display italic text-[14px] tracking-normal text-terracotta/80 normal-case">
          {moment.numeral}
        </span>
        <span className="h-px flex-1 max-w-[48px] bg-sand/70" />
        <span>{moment.tag}</span>
      </div>
      <p className="mt-5 font-body text-[17px] md:text-[19px] leading-[1.7] text-ink max-w-[48ch]">
        {moment.body}
      </p>
    </motion.div>
  );
}

export default function HowItWorks() {
  const [activeRound, setActiveRound] = useState(0);

  return (
    <section id="how" className="relative scroll-mt-16">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10 pt-20 md:pt-32">
        <AnimatedSection>
          <p className="font-display italic text-[15px] text-ink-light tracking-[0.08em]">
            Three ways in. One calm ledger.
          </p>
        </AnimatedSection>
        <h2
          className="mt-5 font-display font-light leading-[1.02] tracking-[-0.015em] text-ink"
          style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
        >
          <span className="block">
            <WordStagger text="Voice while you walk." whileInView />
          </span>
          <span className="block">
            <WordStagger
              text="Receipts by thumb."
              baseDelay={0.25}
              whileInView
            />
          </span>
          <span className="block">
            <WordStagger
              text="Words when words will do."
              baseDelay={0.5}
              whileInView
            />
          </span>
        </h2>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 md:px-10 pt-12 md:pt-24 pb-20 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-16">
          {/* Moments */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            {MOMENTS.map((m, i) => (
              <MomentBlock key={i} moment={m} index={i} onActive={setActiveRound} />
            ))}
          </div>

          {/* Sticky demo on desktop; inline on mobile */}
          <div className="lg:col-span-5 order-1 lg:order-2 mb-10 lg:mb-0">
            <div className="lg:sticky lg:top-[calc(56px+10vh)] flex justify-center lg:justify-end">
              <BreathingDemo size="feature" round={activeRound} />
            </div>
          </div>
        </div>
      </div>

      {/* Hairline divider — stanza break */}
      <div className="mx-auto h-px w-1/4 bg-sand/40" />
    </section>
  );
}
