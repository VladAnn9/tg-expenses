import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleGenAI } from "@google/genai";
import { INSIGHT_PROMPT } from "@/lib/ai/prompts";
import { CATEGORIES } from "@/lib/utils/categories";
import type { ExpenseCategory, Json } from "@/types/database";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const CACHE_TTL_HOURS = 4;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const { searchParams } = req.nextUrl;
  const month =
    searchParams.get("month") ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Check DB cache
  const { data: cached } = await admin
    .from("insights_cache")
    .select("insights, generated_at")
    .eq("user_id", user.id)
    .eq("month", month)
    .single();

  if (cached) {
    const age = now.getTime() - new Date(cached.generated_at).getTime();
    if (age < CACHE_TTL_HOURS * 60 * 60 * 1000) {
      return NextResponse.json({ insights: cached.insights });
    }
  }

  // Cache miss or stale — compute fresh insights
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate =
    monthNum === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

  const prevDate = new Date(year, monthNum - 2, 1);
  const prevStartDate = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: currentExpenses } = await admin
    .from("expenses")
    .select("amount, category")
    .eq("created_by", user.id)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);

  const { data: prevExpenses } = await admin
    .from("expenses")
    .select("amount, category")
    .eq("created_by", user.id)
    .gte("expense_date", prevStartDate)
    .lt("expense_date", startDate);

  const currentRows = currentExpenses ?? [];
  const prevRows = prevExpenses ?? [];

  // Not enough data
  if (currentRows.length < 3 && prevRows.length < 3) {
    await upsertCache(admin, user.id, month, []);
    return NextResponse.json({ insights: [] });
  }

  const currentByCategory = CATEGORIES.map((cat: ExpenseCategory) => ({
    category: cat,
    total: currentRows
      .filter((e) => e.category === cat)
      .reduce((s, e) => s + Number(e.amount), 0),
  })).filter((c) => c.total > 0);

  const prevByCategory = CATEGORIES.map((cat: ExpenseCategory) => ({
    category: cat,
    total: prevRows
      .filter((e) => e.category === cat)
      .reduce((s, e) => s + Number(e.amount), 0),
  })).filter((c) => c.total > 0);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  try {
    const prompt = INSIGHT_PROMPT
      .replace("{count}", "3")
      .replace("{day_of_month}", String(dayOfMonth))
      .replace("{days_in_month}", String(daysInMonth))
      .replace("{categories_with_totals}", JSON.stringify(currentByCategory))
      .replace("{prev_month_categories}", JSON.stringify(prevByCategory));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = (response.text ?? "").trim();
    const cleaned = text.startsWith("```")
      ? text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      : text;

    const insights = JSON.parse(cleaned);
    const result = Array.isArray(insights) ? insights.slice(0, 3) : [];

    await upsertCache(admin, user.id, month, result);

    return NextResponse.json({ insights: result });
  } catch (error) {
    console.error("[insights] generation error:", error);
    return NextResponse.json({ insights: [] });
  }
}

async function upsertCache(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  month: string,
  insights: unknown[]
) {
  await admin.from("insights_cache").upsert(
    {
      user_id: userId,
      month,
      insights: insights as unknown as Json,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" }
  );
}
