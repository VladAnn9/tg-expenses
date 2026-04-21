"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CATEGORY_EMOJI } from "@/lib/utils/categories";
import { SaveIcon, ClearIcon, TrashIcon } from "@/components/ui/icons";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import SwipeableCard from "@/components/ui/swipeable-card";
import type { ExpenseCategory } from "@/types/database";
import ExpenseForm from "./expense-form";
import CardTags from "./card-tags";

interface ExpenseCardProps {
  expense: {
    id: string;
    amount: number;
    category: ExpenseCategory;
    merchant: string | null;
    note: string | null;
    expense_date: string;
    source: string;
    created_by?: string;
    account_name?: string;
  };
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
  loggedByName?: string;
  showAccount?: boolean;
}

export default function ExpenseCard({
  expense,
  isEditing,
  onEditStart,
  onEditEnd,
  onUpdate,
  onDelete,
  loggedByName,
  showAccount,
}: ExpenseCardProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(expense.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Close on Escape
  useEffect(() => {
    if (!isEditing) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEditEnd();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isEditing, onEditEnd]);

  // Close on click outside
  useEffect(() => {
    if (!isEditing) return;
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onEditEnd();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isEditing, onEditEnd]);

  // Reset note value when expense updates
  useEffect(() => {
    setNoteValue(expense.note ?? "");
  }, [expense.note]);

  const saveNoteValue = async (value: string) => {
    setSavingNote(true);
    try {
      await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: value || null }),
      });
      setNoteValue(value);
      setEditingNote(false);
      onUpdate();
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <motion.div ref={cardRef} layout transition={{ layout: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}>
      <AnimatePresence mode="wait" initial={false}>
        {isEditing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-2xl border border-sage/30 bg-cream p-4 shadow-sm"
          >
            <ExpenseForm
              expense={expense}
              onSave={() => {
                onEditEnd();
                onUpdate();
              }}
              onCancel={onEditEnd}
            />
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <SwipeableCard
              onDelete={onDelete}
              onClick={onEditStart}
              className="border border-sand/30 bg-stone p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">
                    {CATEGORY_EMOJI[expense.category]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {expense.merchant || expense.category}
                    </p>
                    <p className="text-xs text-ink-light">
                      {expense.expense_date}
                    </p>
                    <CardTags
                      loggedByName={loggedByName}
                      showAccount={showAccount}
                      accountName={expense.account_name}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                  <p className="font-number text-lg font-light tabular-nums">
                    {Number(expense.amount).toFixed(2)}
                    <span className="ml-1 text-xs text-ink-light">PLN</span>
                  </p>
                  {onDelete && !isMobile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink-light/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline note */}
              <div
                className="mt-2 border-t border-sand/20 pt-2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {editingNote ? (
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setNoteValue(expense.note ?? "");
                        setEditingNote(false);
                      }
                    }}
                  >
                    <input
                      type="text"
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveNoteValue(noteValue);
                        if (e.key === "Escape") {
                          setNoteValue(expense.note ?? "");
                          setEditingNote(false);
                        }
                      }}
                      className="flex-1 min-w-0 rounded-lg border border-sand bg-cream/50 px-3 py-2 text-base focus:border-sage focus:outline-none"
                      placeholder="Add a note..."
                      autoFocus
                    />
                    <button
                      onClick={() => saveNoteValue(noteValue)}
                      disabled={savingNote}
                      className="flex-shrink-0 rounded-lg p-2.5 text-sage transition-colors hover:bg-sage/10 active:scale-90 disabled:opacity-40"
                      title="Save note"
                    >
                      <SaveIcon className="h-5 w-5" />
                    </button>
                    {expense.note && (
                      <button
                        onClick={() => saveNoteValue("")}
                        disabled={savingNote}
                        className="flex-shrink-0 rounded-lg p-2.5 text-terracotta transition-colors hover:bg-terracotta/10 active:scale-90 disabled:opacity-40"
                        title="Clear note"
                      >
                        <ClearIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNote(true);
                    }}
                    className="py-1 text-sm text-ink-light hover:text-ink transition-colors"
                  >
                    {expense.note || "Add note..."}
                  </button>
                )}
              </div>
            </SwipeableCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
