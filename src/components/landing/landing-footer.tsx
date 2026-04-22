"use client";

import GoogleSignIn from "./google-sign-in";

export default function LandingFooter() {
  return (
    <footer className="mt-auto border-t border-sand/30">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10 py-10 md:py-12">
        <div className="flex flex-col items-center gap-6 text-center md:grid md:grid-cols-3 md:items-center md:gap-4 md:text-left">
          <p className="font-body text-[13px] text-ink-light">
            Zen Finance · 2026
          </p>
          <p className="font-display italic text-[15px] text-ink-light md:text-center">
            Fukinsei · asymmetry, imperfection, quiet.
          </p>
          <div className="md:text-right">
            <GoogleSignIn variant="link" label="Sign in" />
          </div>
        </div>
      </div>
    </footer>
  );
}
