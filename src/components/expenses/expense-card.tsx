"use client";

import { useState } from "react";
import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import type { ExpenseCategory } from "@/types/database";
import ExpenseForm from "./expense-form";

interface ExpenseCardProps {
  expense: {
    id: string;
    amount: number;
    category: ExpenseCategory;
    merchant: string | null;
    note: string | null;
    expense_date: string;
    source: string;
  };
  onUpdate: () => void;
}

export default function ExpenseCard({ expense, onUpdate }: ExpenseCardProps) {
  const [editing, setEditing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(expense.note ?? "");
  const [savingNote, setSavingNote] = useState(false);

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteValue || null }),
      });
      setEditingNote(false);
      onUpdate();
    } finally {
      setSavingNote(false);
    }
  };

  if (editing) {
    return (
      <div className="rounded-2xl border border-sand/50 bg-cream p-4">
        <ExpenseForm
          expense={expense}
          onSave={() => {
            setEditing(false);
            onUpdate();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sand/30 bg-cream/30 p-4">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setEditing(true)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{CATEGORY_EMOJI[expense.category]}</span>
          <div>
            <p className="font-medium">
              {expense.merchant || expense.category}
            </p>
            <p className="text-xs text-ink-light">
              {expense.expense_date}
              {expense.source !== "web" && (
                <span className="ml-2 rounded bg-mist px-1.5 py-0.5 text-[10px]">
                  {expense.source}
                </span>
              )}
            </p>
          </div>
        </div>
        <p className="font-display text-lg font-light">
          {Number(expense.amount).toFixed(2)}
          <span className="ml-1 text-xs text-ink-light">PLN</span>
        </p>
      </div>

      {/* Inline note editing */}
      <div className="mt-2 border-t border-sand/20 pt-2">
        {editingNote ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNote();
                if (e.key === "Escape") setEditingNote(false);
              }}
              className="flex-1 rounded-lg border border-sand bg-cream/50 px-3 py-1.5 text-sm focus:border-sage focus:outline-none"
              placeholder="Add a note..."
              autoFocus
            />
            <button
              onClick={saveNote}
              disabled={savingNote}
              className="text-xs text-sage hover:text-sage/80"
            >
              {savingNote ? "..." : "Save"}
            </button>
            {expense.note && (
              <button
                onClick={() => {
                  setNoteValue("");
                  saveNote();
                }}
                className="text-xs text-terracotta hover:text-terracotta/80"
              >
                Clear
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingNote(true);
            }}
            className="text-sm text-ink-light hover:text-ink"
          >
            {expense.note || "Add note..."}
          </button>
        )}
      </div>
    </div>
  );
}
