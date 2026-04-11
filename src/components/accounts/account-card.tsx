"use client";

import { useState } from "react";
import type { AccountType } from "@/types/database";

const TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  cash: "Cash",
  credit: "Credit",
};

interface AccountCardProps {
  account: {
    id: string;
    name: string;
    type: AccountType;
    notes: string | null;
    is_primary: boolean;
    currency: string;
  };
  onUpdate: () => void;
}

export default function AccountCard({ account, onUpdate }: AccountCardProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(account.notes ?? "");
  const [saving, setSaving] = useState(false);

  const saveNote = async (value: string) => {
    setSaving(true);
    try {
      await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      setEditingNote(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-sand/30 bg-cream/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-medium">{account.name}</p>
          {account.is_primary && (
            <span className="rounded bg-sage/10 px-1.5 py-0.5 text-[10px] text-sage">
              Primary
            </span>
          )}
        </div>
        <span className="rounded bg-mist px-2 py-0.5 text-xs text-ink-light">
          {TYPE_LABELS[account.type]}
        </span>
      </div>

      <div className="mt-2 border-t border-sand/20 pt-2">
        {editingNote ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNote(noteValue);
                if (e.key === "Escape") {
                  setNoteValue(account.notes ?? "");
                  setEditingNote(false);
                }
              }}
              className="flex-1 min-w-0 rounded-lg border border-sand bg-cream/50 px-3 py-2 text-base focus:border-sage focus:outline-none"
              placeholder="Add a note..."
              autoFocus
            />
            <button
              onClick={() => saveNote(noteValue)}
              disabled={saving}
              className="rounded-lg px-4 py-2.5 text-sm text-sage transition-colors hover:bg-sage/10 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingNote(true)}
            className="py-1 text-sm text-ink-light transition-colors hover:text-ink"
          >
            {account.notes || "Add note..."}
          </button>
        )}
      </div>
    </div>
  );
}
