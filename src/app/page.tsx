import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  // Supabase may redirect OAuth code to root — forward to callback
  if (code) {
    redirect(`/auth/callback?code=${code}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/logo-128.png"
          alt=""
          width={80}
          height={80}
          className="mx-auto mb-6 rounded-full"
          priority
        />
        <h1 className="font-display text-6xl font-light tracking-tight text-ink">
          Zen Finance
        </h1>
        <p className="mt-4 text-lg text-ink-light">
          Mindful expense tracking via Telegram
        </p>
        <Link
          href="/login"
          className="mt-12 inline-flex items-center justify-center rounded-xl bg-ink px-8 py-4 text-cream transition-all hover:bg-ink/90 active:scale-[0.98]"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
