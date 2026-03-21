import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
          <h1 className="font-display text-2xl font-light tracking-tight">
            Zen Finance
          </h1>
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
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
