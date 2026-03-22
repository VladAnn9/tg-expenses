"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";

interface ExpenseFormProps {
  expense?: {
    id: string;
    amount: number;
    category: ExpenseCategory;
    merchant: string | null;
    note: string | null;
    expense_date: string;
  };
  onSave: () => void;
  onCancel: () => void;
}

export default function ExpenseForm({ expense, onSave, onCancel }: ExpenseFormProps) {
  const isEdit = !!expense;
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "Other");
  const [merchant, setMerchant] = useState(expense?.merchant ?? "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [date, setDate] = useState(
    expense?.expense_date ?? new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/expenses/${expense.id}` : "/api/expenses";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          category,
          merchant: merchant || null,
          note: note || null,
          expense_date: date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-display text-xl font-light">
        {isEdit ? "Edit Expense" : "Add Expense"}
      </h3>

      <div>
        <label className="block text-sm text-ink-light">Amount (PLN)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-light">Category</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors ${
                category === cat
                  ? "border-sage bg-sage/10 text-ink"
                  : "border-sand/50 bg-cream/30 text-ink-light hover:border-sand"
              }`}
            >
              <span>{CATEGORY_EMOJI[cat]}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-ink-light">Merchant</label>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="block text-sm text-ink-light">Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="block text-sm text-ink-light">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-terracotta">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-xl bg-ink py-3 text-cream transition-all hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Saving..." : isEdit ? "Update" : "Add Expense"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-sand px-6 py-3 text-ink-light transition-colors hover:bg-mist/50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
