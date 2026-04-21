"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory, AccountType } from "@/types/database";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  is_primary: boolean;
}

interface Subcategory {
  id: string;
  name: string;
}

interface ExpenseFormProps {
  expense?: {
    id: string;
    amount: number;
    category: ExpenseCategory;
    merchant: string | null;
    note: string | null;
    expense_date: string;
    account_id?: string;
    subcategory_id?: string | null;
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
  const [accountId, setAccountId] = useState(expense?.account_id ?? "");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subcategoryId, setSubcategoryId] = useState(expense?.subcategory_id ?? "");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        const accts: Account[] = data.accounts ?? [];
        setAccounts(accts);
        if (!accountId && accts.length > 0) {
          const primary = accts.find((a) => a.is_primary);
          setAccountId(primary?.id ?? accts[0].id);
        }
      });
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!category) return;
    fetch(`/api/subcategories?category=${category}`)
      .then((r) => r.json())
      .then((data) => {
        setSubcategories(data.subcategories ?? []);
        // Clear subcategory if it doesn't belong to the new category
        if (subcategoryId) {
          const stillValid = (data.subcategories ?? []).some(
            (s: Subcategory) => s.id === subcategoryId
          );
          if (!stillValid) setSubcategoryId("");
        }
      });
  }, [category]);

  const handleCreateSubcategory = async () => {
    const name = newSubcategoryName.trim();
    if (!name) return;
    setCreatingSub(true);
    try {
      const res = await fetch("/api/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parent_category: category }),
      });
      if (res.ok) {
        const created = await res.json();
        setSubcategories((prev) => [...prev, { id: created.id, name: created.name }]);
        setSubcategoryId(created.id);
        setNewSubcategoryName("");
        setShowNewSubcategory(false);
      }
    } finally {
      setCreatingSub(false);
    }
  };

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
          subcategory_id: subcategoryId || null,
          ...(accountId && !isEdit ? { account_id: accountId } : {}),
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
          className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-base text-ink focus:border-sage focus:outline-none"
          placeholder="0.00"
          inputMode="decimal"
          required
        />
      </div>

      {accounts.length > 1 && !isEdit && (
        <div>
          <label className="block text-sm text-ink-light">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}{a.is_primary ? " (Primary)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-ink-light">Category</label>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategory(cat)}
              className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 transition-all ${
                category === cat
                  ? "border-sage bg-sage/10 text-ink shadow-sm"
                  : "border-sand/30 bg-cream/30 text-ink-light"
              }`}
            >
              <span className="text-lg">{CATEGORY_EMOJI[cat]}</span>
              <span className="w-full truncate text-center text-[10px] leading-tight">{cat}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-ink-light">Subcategory</label>
        <div className="mt-1 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubcategoryId("")}
            className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
              !subcategoryId
                ? "border-sage bg-sage/10 text-ink"
                : "border-sand/50 bg-cream/30 text-ink-light hover:border-sand"
            }`}
          >
            None
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubcategoryId(sub.id)}
              className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                subcategoryId === sub.id
                  ? "border-sage bg-sage/10 text-ink"
                  : "border-sand/50 bg-cream/30 text-ink-light hover:border-sand"
              }`}
            >
              {sub.name}
            </button>
          ))}
          {!showNewSubcategory ? (
            <button
              type="button"
              onClick={() => setShowNewSubcategory(true)}
              className="rounded-lg border border-dashed border-sand/50 px-3.5 py-2.5 text-sm text-ink-light transition-colors hover:border-sage hover:text-ink"
            >
              +
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setShowNewSubcategory(false);
                  setNewSubcategoryName("");
                }
              }}
            >
              <input
                type="text"
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleCreateSubcategory(); }
                  if (e.key === "Escape") { setShowNewSubcategory(false); setNewSubcategoryName(""); }
                }}
                placeholder="Name..."
                className="w-28 rounded-lg border border-sand bg-cream/50 px-3 py-2.5 text-sm focus:border-sage focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateSubcategory}
                disabled={creatingSub || !newSubcategoryName.trim()}
                className="rounded-lg bg-sage/10 px-3 py-2.5 text-sm text-sage transition-colors hover:bg-sage/20 disabled:opacity-40"
              >
                {creatingSub ? "..." : "Add"}
              </button>
            </div>
          )}
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
          className="mt-1 w-full max-w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-60"
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
