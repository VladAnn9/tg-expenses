"use client";

// Kept as a separate route for invite-link flows (/login?redirectTo=…)
// and OAuth-callback error states (/login?error=auth). The landing page
// also exposes Google sign-in directly for the 95% happy path.

import Image from "next/image";
import GoogleSignIn from "@/components/landing/google-sign-in";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/logo-128.png"
          alt=""
          width={64}
          height={64}
          className="mx-auto mb-5 rounded-full"
          priority
        />
        <h1 className="font-display text-5xl font-light tracking-tight text-ink">
          Zen Finance
        </h1>
        <p className="mt-4 text-ink-light">Mindful expense tracking</p>

        <GoogleSignIn variant="ghost" label="Sign in with Google" className="mt-12 w-full" />
      </div>
    </div>
  );
}
