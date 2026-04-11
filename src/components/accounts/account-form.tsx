"use client";

import { useState } from "react";
import type { AccountType } from "@/types/database";

const ACCOUNT_TYPES: AccountType[] = ["checking", "savings", "cash", "credit"];

const TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  cash: "Cash",
  credit: "Credit",
};

interface AccountFormProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function AccountForm({ onSave, onCancel }: AccountFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create account");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-display text-xl font-light">New Account</h3>

      <div>
        <label className="block text-sm text-ink-light">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
          placeholder="e.g. Savings"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-light">Type</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                type === t
                  ? "border-sage bg-sage/10 text-ink"
                  : "border-sand/50 bg-cream/30 text-ink-light hover:border-sand"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-ink-light">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
          placeholder="Optional"
        />
      </div>

      {error && <p className="text-sm text-terracotta">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 rounded-xl bg-ink py-3 text-cream transition-all hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Account"}
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
