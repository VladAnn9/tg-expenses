import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingView from "@/components/landing/landing-view";

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

  return <LandingView />;
}
