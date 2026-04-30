"use client";

import { useState, useEffect } from "react";
import type { AccountType } from "@/types/database";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  is_primary: boolean;
}

interface IncomeFormProps {
  income?: {
    id: string;
    amount: number;
    source_label: string | null;
    note: string | null;
    income_date: string;
    account_id?: string;
  };
  onSave: () => void;
  onCancel: () => void;
}

export default function IncomeForm({ income, onSave, onCancel }: IncomeFormProps) {
  const isEdit = !!income;
  const [amount, setAmount] = useState(income?.amount?.toString() ?? "");
  const [sourceLabel, setSourceLabel] = useState(income?.source_label ?? "");
  const [note, setNote] = useState(income?.note ?? "");
  const [date, setDate] = useState(
    income?.income_date ?? new Date().toISOString().split("T")[0]
  );
  const [accountId, setAccountId] = useState(income?.account_id ?? "");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts once on mount.
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts ?? []));
  }, []);

  // Auto-select primary (or first) account once accounts arrive, but only if
  // the user hasn't already picked one. Splitting this from the fetch effect
  // keeps each effect's deps honest.
  useEffect(() => {
    if (accountId || accounts.length === 0) return;
    const primary = accounts.find((a) => a.is_primary);
    setAccountId(primary?.id ?? accounts[0].id);
  }, [accounts, accountId]);

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
      const url = isEdit ? `/api/income/${income.id}` : "/api/income";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          source_label: sourceLabel || null,
          note: note || null,
          income_date: date,
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
        {isEdit ? "Edit Income" : "Add Income"}
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
        <label className="block text-sm text-ink-light">Source</label>
        <input
          type="text"
          value={sourceLabel}
          onChange={(e) => setSourceLabel(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
          placeholder="e.g. Salary, Freelance"
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
          {loading ? "Saving..." : isEdit ? "Update" : "Add Income"}
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
