"use client";

import { useState, useEffect, useCallback } from "react";
import ExpenseCard from "@/components/expenses/expense-card";
import ExpenseForm from "@/components/expenses/expense-form";
import AnimatedSection from "@/components/ui/animated-section";
import AnimatedContent from "@/components/ui/animated-content";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  merchant: string | null;
  note: string | null;
  expense_date: string;
  source: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterCategory, setFilterCategory] = useState<string>("");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month, limit: "50" });
    if (filterCategory) params.set("category", filterCategory);
    const res = await fetch(`/api/expenses?${params}`);
    if (res.ok) {
      const data = await res.json();
      setExpenses(data.expenses);
    }
    setLoading(false);
  }, [month, filterCategory]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const [year, monthNum] = month.split("-").map(Number);
  const monthName = new Date(year, monthNum - 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <AnimatedSection>
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="rounded-lg px-3 py-2 text-ink-light transition-colors hover:bg-mist/50 hover:text-ink active:scale-95"
          >
            ← Prev
          </button>
          <AnimatedContent transitionKey={month}>
            <h2 className="font-display text-xl font-light">{monthName}</h2>
          </AnimatedContent>
          <button
            onClick={nextMonth}
            className="rounded-lg px-3 py-2 text-ink-light transition-colors hover:bg-mist/50 hover:text-ink active:scale-95"
          >
            Next →
          </button>
        </div>
      </AnimatedSection>

      {/* Category filter */}
      <AnimatedSection delay={0.05}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory("")}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              !filterCategory
                ? "border-sage bg-sage/10 text-ink"
                : "border-sand/50 text-ink-light hover:border-sand"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setFilterCategory(filterCategory === cat ? "" : cat)
              }
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                filterCategory === cat
                  ? "border-sage bg-sage/10 text-ink"
                  : "border-sand/50 text-ink-light hover:border-sand"
              }`}
            >
              {CATEGORY_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>
      </AnimatedSection>

      {/* Add expense button */}
      <AnimatedSection delay={0.1}>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="w-full rounded-xl border-2 border-dashed border-sand py-3 text-sm text-ink-light transition-colors hover:border-sage hover:text-ink"
        >
          + Add Expense
        </button>
      </AnimatedSection>

      {/* Add expense form */}
      {showForm && (
        <AnimatedSection>
          <div className="rounded-2xl border border-sand/50 bg-cream p-4">
            <ExpenseForm
              onSave={() => {
                setShowForm(false);
                fetchExpenses();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </AnimatedSection>
      )}

      {/* Expense list — animates on month/filter change */}
      <AnimatedContent transitionKey={`${month}-${filterCategory}`} className="space-y-3">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-mist/50"
              />
            ))}
          </>
        ) : expenses.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-light">
            No expenses for this period.
          </p>
        ) : (
          expenses.map((expense, i) => (
            <AnimatedSection key={expense.id} delay={i * 0.03}>
              <ExpenseCard
                expense={expense}
                isEditing={editingId === expense.id}
                onEditStart={() => { setEditingId(expense.id); setShowForm(false); }}
                onEditEnd={() => setEditingId(null)}
                onUpdate={fetchExpenses}
              />
            </AnimatedSection>
          ))
        )}
      </AnimatedContent>
    </div>
  );
}
