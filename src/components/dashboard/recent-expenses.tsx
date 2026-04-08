import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";
import Link from "next/link";

interface RecentExpense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  merchant: string | null;
  expense_date: string;
  note: string | null;
  created_by?: string;
}

interface RecentExpensesProps {
  expenses: RecentExpense[];
  memberNames?: Record<string, string>;
}

export default function RecentExpenses({ expenses, memberNames }: RecentExpensesProps) {
  if (expenses.length === 0) {
    return (
      <section>
        <h2 className="font-display text-lg font-light text-ink-light">
          Recent Expenses
        </h2>
        <p className="mt-4 text-center text-sm text-ink-light">
          Nothing here yet. Send a message to the Telegram bot or add one from
          the web.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-light text-ink-light">
          Recent Expenses
        </h2>
        <Link
          href="/dashboard/expenses"
          className="text-sm text-ink-light transition-colors hover:text-ink"
        >
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {expenses.map((expense) => {
          const loggedBy =
            memberNames && expense.created_by
              ? memberNames[expense.created_by]
              : undefined;

          return (
            <div
              key={expense.id}
              className="flex items-center justify-between rounded-xl border border-sand/30 bg-cream/30 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {CATEGORY_EMOJI[expense.category]}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {expense.merchant || expense.note || expense.category}
                  </p>
                  <p className="text-xs text-ink-light">
                    {expense.expense_date}
                    {loggedBy && (
                      <span className="ml-2 rounded bg-sage/10 px-1.5 py-0.5 text-[10px] text-sage">
                        {loggedBy}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <p className="font-number text-lg font-light tabular-nums">
                {Number(expense.amount).toFixed(2)}
                <span className="ml-1 font-body text-xs text-ink-light">PLN</span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
