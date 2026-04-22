"use client";

import FeatureMoments from "./feature-moments";
import FinalCta from "./final-cta";
import Hero from "./hero";
import HowItWorks from "./how-it-works";
import LandingFooter from "./landing-footer";
import TopNav from "./top-nav";

export default function LandingView() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <FeatureMoments />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
