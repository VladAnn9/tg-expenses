import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCategory } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

interface ImportRow {
  type?: "expense" | "income";
  amount: string | number;
  category?: string;
  merchant?: string;
  expense_date?: string;
  note?: string;
  source_label?: string;
}

interface ImportError {
  row: number;
  reason: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const body = await req.json();
  const rows: ImportRow[] = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  // Get user's primary account
  const { data: account } = await admin
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .limit(1)
    .single();

  let accountId = account?.id;
  if (!accountId) {
    const { data: fallback } = await admin
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    accountId = fallback?.id;
  }

  if (!accountId) {
    return NextResponse.json({ error: "No account found" }, { status: 400 });
  }

  const errors: ImportError[] = [];
  const expenseInserts: {
    account_id: string;
    amount: number;
    currency: string;
    category: ExpenseCategory;
    merchant: string | null;
    note: string | null;
    source: "import";
    expense_date: string;
    created_by: string;
  }[] = [];
  const incomeInserts: {
    account_id: string;
    amount: number;
    currency: string;
    source_label: string | null;
    note: string | null;
    income_date: string;
    created_by: string;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const amount = Number(row.amount);

    if (isNaN(amount) || amount <= 0) {
      errors.push({ row: i + 1, reason: "Invalid or missing amount" });
      continue;
    }

    const dateStr = row.expense_date || new Date().toISOString().split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(Date.parse(dateStr))) {
      errors.push({ row: i + 1, reason: `Invalid date: ${row.expense_date}` });
      continue;
    }

    if (row.type === "income") {
      incomeInserts.push({
        account_id: accountId,
        amount,
        currency: "PLN",
        source_label: row.source_label || row.merchant?.trim() || row.note?.trim() || null,
        note: row.note?.trim() || null,
        income_date: dateStr,
        created_by: user.id,
      });
    } else {
      const category = row.category && isValidCategory(row.category)
        ? row.category
        : "Other";

      expenseInserts.push({
        account_id: accountId,
        amount,
        currency: "PLN",
        category: category as ExpenseCategory,
        merchant: row.merchant?.trim() || null,
        note: row.note?.trim() || null,
        source: "import",
        expense_date: dateStr,
        created_by: user.id,
      });
    }
  }

  let importedExpenses = 0;
  let importedIncome = 0;

  if (expenseInserts.length > 0) {
    const { data, error } = await admin
      .from("expenses")
      .insert(expenseInserts)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    importedExpenses = data?.length ?? 0;
  }

  if (incomeInserts.length > 0) {
    const { data, error } = await admin
      .from("income_entries")
      .insert(incomeInserts)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    importedIncome = data?.length ?? 0;
  }

  return NextResponse.json({
    imported: importedExpenses + importedIncome,
    imported_expenses: importedExpenses,
    imported_income: importedIncome,
    skipped: errors.length,
    errors,
  });
}
