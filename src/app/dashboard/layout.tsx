import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NAV_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/household", label: "Household" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-sand/50 bg-cream/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image
              src="/logo-64.png"
              alt="Zen Finance"
              width={32}
              height={32}
              className="rounded-full"
              priority
            />
            <span className="font-display text-xl font-light tracking-tight">
              Zen Finance
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-light">
              {user.user_metadata?.full_name?.split(" ")[0] ?? user.email}
            </span>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-sm text-ink-light transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto max-w-2xl overflow-x-auto px-6 pb-2">
          <div className="flex gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs text-ink-light transition-colors hover:bg-mist/50 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
