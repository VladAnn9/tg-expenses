import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHouseholdMemberIds } from "@/lib/supabase/household";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const memberIds = await getHouseholdMemberIds(admin, user.id);

  // Get distinct months from expenses
  const { data: expenseMonths } = await admin
    .from("expenses")
    .select("expense_date")
    .in("created_by", memberIds);

  // Get distinct months from income
  const { data: incomeMonths } = await admin
    .from("income_entries")
    .select("income_date")
    .in("created_by", memberIds);

  const monthSet = new Set<string>();

  // Always include current month
  const now = new Date();
  monthSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  for (const e of expenseMonths ?? []) {
    const d = e.expense_date;
    if (d) monthSet.add(d.substring(0, 7));
  }

  for (const e of incomeMonths ?? []) {
    const d = e.income_date;
    if (d) monthSet.add(d.substring(0, 7));
  }

  const months = [...monthSet].sort().reverse();

  return NextResponse.json({ months });
}
