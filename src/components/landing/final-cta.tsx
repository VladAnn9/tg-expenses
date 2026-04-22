"use client";

import AnimatedSection from "@/components/ui/animated-section";
import GoogleSignIn from "./google-sign-in";

export default function FinalCta() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-3xl px-6 md:px-10 pt-28 md:pt-40 pb-20 md:pb-32 text-center">
        <AnimatedSection>
          <h2
            className="font-display font-light tracking-[-0.02em] text-ink leading-[1.05]"
            style={{ fontSize: "clamp(44px, 6vw, 72px)" }}
          >
            Keep a quieter ledger.
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.12}>
          <p className="mx-auto mt-6 md:mt-7 max-w-[36ch] font-body text-[16px] md:text-[17px] leading-[1.6] text-ink-light">
            Sign in with Google. Link Telegram in one tap. Send your first expense in a minute.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.22}>
          <div className="mt-10 flex justify-center">
            <GoogleSignIn />
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.32}>
          <p className="mt-7 font-body text-[13px] text-ink-light/70">
            A personal project. PLN only. Free because it costs us nothing to run.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
