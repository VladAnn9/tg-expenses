"use client";

import { useState, useEffect, useCallback } from "react";
import AnimatedSection from "@/components/ui/animated-section";
import TelegramLink from "@/components/telegram-link";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/utils/categories";
import { useUndoToast } from "@/components/ui/undo-toast";
import { MoreIcon } from "@/components/ui/icons";
import type { ExpenseCategory } from "@/types/database";

interface Settings {
  roast_enabled: boolean;
  telegram_linked: boolean;
  household_id: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  parent_category: ExpenseCategory;
  expense_count: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [togglingRoast, setTogglingRoast] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Add subcategory state
  const [addingCategory, setAddingCategory] = useState<ExpenseCategory | null>(
    null
  );
  const [newSubName, setNewSubName] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);

  // Merge state
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

  const { showUndo, UndoToastUI } = useUndoToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Fetch settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setSettings(data);
      })
      .finally(() => setLoadingSettings(false));
  }, []);

  // Fetch subcategories
  const fetchSubcategories = useCallback(() => {
    setLoadingSubs(true);
    fetch("/api/subcategories")
      .then((r) => r.json())
      .then((data) => setSubcategories(data.subcategories ?? []))
      .finally(() => setLoadingSubs(false));
  }, []);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  // Toggle roast
  const toggleRoast = async () => {
    if (!settings || togglingRoast) return;
    setTogglingRoast(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roast_enabled: !settings.roast_enabled }),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
    }
    setTogglingRoast(false);
  };

  // Add subcategory
  const handleAddSubcategory = async (parentCategory: ExpenseCategory) => {
    if (!newSubName.trim() || addingLoading) return;
    setAddingLoading(true);
    const res = await fetch("/api/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSubName.trim(),
        parent_category: parentCategory,
      }),
    });
    if (res.ok) {
      setNewSubName("");
      setAddingCategory(null);
      fetchSubcategories();
    }
    setAddingLoading(false);
  };

  // Rename subcategory
  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const res = await fetch(`/api/subcategories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditName("");
      fetchSubcategories();
    }
  };

  // Delete subcategory — execute immediately, undo by re-creating
  const handleDelete = async (id: string, name: string) => {
    const sub = subcategories.find((s) => s.id === id);
    if (!sub) return;

    // Execute immediately
    setSubcategories((s) => s.filter((item) => item.id !== id));
    await fetch(`/api/subcategories/${id}`, { method: "DELETE" });

    showUndo(`Deleted "${name}"`, async () => {
      // Reverse: re-create the subcategory
      await fetch("/api/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sub.name,
          parent_category: sub.parent_category,
        }),
      });
      fetchSubcategories();
    });
  };

  // Merge subcategory — execute immediately (no undo — too complex to reverse expense reassignment)
  const handleMerge = async (sourceId: string) => {
    if (!mergeTargetId) return;
    const sourceSub = subcategories.find((s) => s.id === sourceId);
    const targetSub = subcategories.find((s) => s.id === mergeTargetId);
    if (!sourceSub || !targetSub) return;

    if (!confirm(`Merge "${sourceSub.name}" into "${targetSub.name}"? This reassigns all expenses and cannot be undone.`)) return;

    const targetId = mergeTargetId;
    setSubcategories((s) =>
      s
        .filter((sub) => sub.id !== sourceId)
        .map((sub) =>
          sub.id === targetId
            ? { ...sub, expense_count: sub.expense_count + sourceSub.expense_count }
            : sub
        )
    );
    setMergingId(null);
    setMergeTargetId("");

    await fetch(`/api/subcategories/${sourceId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: targetId }),
    });
  };

  // Group subcategories by parent_category
  const grouped = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = subcategories.filter((s) => s.parent_category === cat);
      return acc;
    },
    {} as Record<ExpenseCategory, Subcategory[]>
  );

  return (
    <div className="space-y-8">
      <UndoToastUI />
      <AnimatedSection>
        <h1 className="font-display text-2xl font-light">Settings</h1>
      </AnimatedSection>

      {/* Roast Toggle */}
      <AnimatedSection delay={0.05}>
        <div className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-display text-lg font-light">Roast Mode</h2>
              <p className="mt-1 text-sm text-ink-light">
                Get snarky commentary on your spending habits from the Telegram
                bot.
              </p>
            </div>
            {loadingSettings ? (
              <div className="mt-1 h-7 w-12 flex-shrink-0 animate-pulse rounded-full bg-mist/50" />
            ) : (
              <button
                onClick={toggleRoast}
                disabled={togglingRoast}
                className={`relative mt-1 h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-300 ${
                  settings?.roast_enabled
                    ? "bg-sage"
                    : "bg-sand/60"
                } disabled:opacity-50`}
                aria-label={`Roast mode ${settings?.roast_enabled ? "on" : "off"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-cream shadow-sm transition-transform duration-300 ${
                    settings?.roast_enabled
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </AnimatedSection>

      {/* Telegram Link */}
      <AnimatedSection delay={0.1}>
        <div className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
          <h2 className="font-display text-lg font-light">Telegram</h2>
          <p className="mt-1 text-sm text-ink-light">
            {settings?.telegram_linked
              ? "Your Telegram account is linked."
              : "Link your Telegram account to log expenses via chat."}
          </p>
          {!settings?.telegram_linked && <TelegramLink />}
          {settings?.telegram_linked && (
            <p className="mt-3 text-sm text-sage">Connected</p>
          )}
        </div>
      </AnimatedSection>

      {/* Import */}
      <AnimatedSection delay={0.15}>
        <a
          href="/dashboard/import"
          className="flex items-center justify-between rounded-2xl border border-sand/30 bg-cream/50 p-6 transition-colors hover:bg-cream/80"
        >
          <div>
            <h2 className="font-display text-lg font-light">Import Expenses</h2>
            <p className="mt-1 text-sm text-ink-light">
              Bulk import from a CSV file — bank exports, other apps.
            </p>
          </div>
          <span className="text-ink-light">→</span>
        </a>
      </AnimatedSection>

      {/* Subcategory Management */}
      <AnimatedSection delay={0.2}>
        <div className="rounded-2xl border border-sand/30 bg-cream/50 p-6">
          <h2 className="font-display text-lg font-light">Subcategories</h2>
          <p className="mt-1 text-sm text-ink-light">
            Organize expenses with custom subcategories under each category.
          </p>

          {loadingSubs ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-mist/50"
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {CATEGORIES.map((cat) => (
                <div key={cat}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-ink">
                      {CATEGORY_EMOJI[cat]} {cat}
                    </h3>
                    <button
                      onClick={() => {
                        setAddingCategory(
                          addingCategory === cat ? null : cat
                        );
                        setNewSubName("");
                      }}
                      className="rounded-lg px-3 py-2 text-sm text-ink-light transition-colors hover:bg-mist/50 hover:text-ink"
                    >
                      {addingCategory === cat ? "Cancel" : "+ Add"}
                    </button>
                  </div>

                  {/* Add form */}
                  {addingCategory === cat && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddSubcategory(cat);
                        }}
                        placeholder="Subcategory name"
                        className="flex-1 rounded-lg border border-sand/50 bg-stone px-3 py-2.5 text-base text-ink placeholder:text-ink-light/50 focus:border-sage focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddSubcategory(cat)}
                        disabled={addingLoading || !newSubName.trim()}
                        className="rounded-lg bg-ink px-4 py-2.5 text-sm text-cream transition-colors hover:bg-ink/90 disabled:opacity-50"
                      >
                        {addingLoading ? "..." : "Save"}
                      </button>
                    </div>
                  )}

                  {/* Subcategory list */}
                  {grouped[cat].length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {grouped[cat].map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-mist/30"
                        >
                          {editingId === sub.id ? (
                            <div className="flex flex-1 gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleRename(sub.id);
                                  if (e.key === "Escape") {
                                    setEditingId(null);
                                    setEditName("");
                                  }
                                }}
                                className="flex-1 rounded-lg border border-sand/50 bg-stone px-2 py-1 text-sm text-ink focus:border-sage focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRename(sub.id)}
                                className="text-xs text-sage hover:text-sage/80"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditName("");
                                }}
                                className="text-xs text-ink-light hover:text-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : mergingId === sub.id ? (
                            <div className="flex flex-1 items-center gap-2">
                              <span className="text-sm text-ink">
                                Merge into:
                              </span>
                              <select
                                value={mergeTargetId}
                                onChange={(e) =>
                                  setMergeTargetId(e.target.value)
                                }
                                className="flex-1 rounded-lg border border-sand/50 bg-stone px-2 py-1 text-sm text-ink focus:border-sage focus:outline-none"
                              >
                                <option value="">Select target...</option>
                                {grouped[cat]
                                  .filter((s) => s.id !== sub.id)
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.expense_count})
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => handleMerge(sub.id)}
                                disabled={!mergeTargetId}
                                className="text-xs text-terracotta hover:text-terracotta/80 disabled:opacity-50"
                              >
                                Merge
                              </button>
                              <button
                                onClick={() => {
                                  setMergingId(null);
                                  setMergeTargetId("");
                                }}
                                className="text-xs text-ink-light hover:text-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-ink">
                                  {sub.name}
                                </span>
                                <span className="rounded-full bg-mist/50 px-2 py-0.5 text-xs text-ink-light">
                                  {sub.expense_count}
                                </span>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === sub.id ? null : sub.id)}
                                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink-light transition-colors hover:bg-mist/50 hover:text-ink"
                                >
                                  <MoreIcon className="h-4 w-4" />
                                </button>
                                {openMenuId === sub.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={() => setOpenMenuId(null)}
                                    />
                                    <div className="absolute right-0 top-8 z-20 min-w-[120px] rounded-lg border border-sand/50 bg-cream py-1 shadow-lg">
                                      <button
                                        onClick={() => {
                                          setEditingId(sub.id);
                                          setEditName(sub.name);
                                          setMergingId(null);
                                          setOpenMenuId(null);
                                        }}
                                        className="flex w-full px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-mist/50"
                                      >
                                        Rename
                                      </button>
                                      {grouped[cat].length > 1 && (
                                        <button
                                          onClick={() => {
                                            setMergingId(sub.id);
                                            setMergeTargetId("");
                                            setEditingId(null);
                                            setOpenMenuId(null);
                                          }}
                                          className="flex w-full px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-mist/50"
                                        >
                                          Merge
                                        </button>
                                      )}
                                      {sub.expense_count === 0 && (
                                        <button
                                          onClick={() => {
                                            handleDelete(sub.id, sub.name);
                                            setOpenMenuId(null);
                                          }}
                                          className="flex w-full px-4 py-3 text-left text-sm text-terracotta transition-colors hover:bg-terracotta/5"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-ink-light/60">
                      No subcategories yet
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
