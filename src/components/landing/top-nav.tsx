"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import GoogleSignIn from "./google-sign-in";

export default function TopNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-300 ${
        solid
          ? "border-sand/40 bg-stone/90 backdrop-blur-md"
          : "border-transparent bg-stone/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-128.png"
            alt=""
            width={28}
            height={28}
            className="rounded-full"
            priority
          />
          <span className="font-display text-[17px] font-medium text-ink tracking-tight">
            Zen Finance
          </span>
        </Link>
        <GoogleSignIn variant="link" label="Sign in" />
      </div>
    </header>
  );
}
