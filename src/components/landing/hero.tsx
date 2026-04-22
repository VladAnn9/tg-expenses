"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ZEN_EASE } from "@/lib/motion";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import BreathingDemo from "./breathing-demo";
import GradientMesh from "./gradient-mesh";
import WordStagger from "./word-stagger";
import GoogleSignIn from "./google-sign-in";

export default function Hero() {
  const reduced = useReducedMotion();
  const [breathWeight, setBreathWeight] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);
  const [demoPaused, setDemoPaused] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setBreathWeight(true), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = demoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setDemoPaused(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden">
      <GradientMesh />

      <div className="mx-auto w-full max-w-6xl px-6 md:px-10 pb-16 md:pb-24 pt-10 md:pt-16 min-h-[calc(100svh-56px)] flex items-center">
        <div className="grid w-full grid-cols-1 gap-10 md:gap-16 lg:grid-cols-12 lg:items-center">
          {/* Type block */}
          <div className="lg:col-span-8">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08, ease: ZEN_EASE }}
              className="font-display italic text-[15px] text-ink-light/80 tracking-[0.08em]"
            >
              A quieter way to keep accounts.
            </motion.p>

            <h1
              className="mt-5 font-display leading-[0.95] tracking-[-0.02em] text-ink"
              style={{
                fontSize: "clamp(48px, 7vw, 104px)",
                fontWeight: reduced ? 400 : breathWeight ? 400 : 300,
                transition: reduced
                  ? undefined
                  : "font-weight 1200ms cubic-bezier(0.25,0.1,0.25,1)",
              }}
            >
              <span className="block whitespace-nowrap">
                <WordStagger text="Speak it." baseDelay={0.2} />
              </span>
              <span className="block whitespace-nowrap">
                <WordStagger text="It remembers." baseDelay={0.56} />
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9, ease: ZEN_EASE }}
              className="mt-7 md:mt-8 max-w-[34ch] text-[16px] md:text-[18px] leading-[1.55] text-ink-light"
            >
              Zen Finance listens to voice notes, reads your receipts, and keeps a
              quiet ledger of where your money went — all inside the Telegram
              chat you already use.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.1, ease: ZEN_EASE }}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4"
            >
              <GoogleSignIn />
              <a
                href="#how"
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById("how");
                  if (!target) return;
                  const reduce = window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches;
                  target.scrollIntoView({
                    behavior: reduce ? "auto" : "smooth",
                    block: "start",
                  });
                  history.replaceState(null, "", "#how");
                }}
                className="group inline-flex items-center gap-1.5 font-body text-[15px] text-ink-light transition-colors hover:text-ink"
              >
                <span className="border-b border-transparent group-hover:border-ink/60">
                  See how it works
                </span>
                <span aria-hidden className="transition-transform group-hover:translate-y-[2px]">
                  ↓
                </span>
              </a>
            </motion.div>
          </div>

          {/* Demo */}
          <motion.div
            ref={demoRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.3, ease: ZEN_EASE }}
            className="lg:col-span-4 flex justify-center lg:justify-end lg:-translate-y-4"
          >
            <BreathingDemo size="hero" paused={demoPaused} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
