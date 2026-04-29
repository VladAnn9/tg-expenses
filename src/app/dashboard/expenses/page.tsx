"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import ExpenseCard from "@/components/expenses/expense-card";
import ExpenseForm from "@/components/expenses/expense-form";
import IncomeForm from "@/components/expenses/income-form";
import IncomeCard from "@/components/expenses/income-card";
import AnimatedSection from "@/components/ui/animated-section";
import AnimatedContent from "@/components/ui/animated-content";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/utils/categories";
import { useUndoToast } from "@/components/ui/undo-toast";
import type { ExpenseCategory, AccountType } from "@/types/database";

interface IncomeEntry {
  id: string;
  amount: number;
  source_label: string | null;
  note: string | null;
  income_date: string;
  account_id?: string;
  created_by?: string;
}

interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  merchant: string | null;
  note: string | null;
  expense_date: string;
  source: string;
  account_id?: string;
  created_by?: string;
}

interface Account {
  id: string;
  name: string;
  type: AccountType;
  is_primary: boolean;
}

interface Subcategory {
  id: string;
  name: string;
  parent_category: ExpenseCategory;
  expense_count: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filterAccount, setFilterAccount] = useState<string>("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("");
  const [allSubcategories, setAllSubcategories] = useState<Subcategory[] | null>(null);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"expenses" | "income">("expenses");
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [loadingIncome, setLoadingIncome] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [filterIncomeAccount, setFilterIncomeAccount] = useState<string>("");
  const { showUndo, UndoToastUI } = useUndoToast();

  // Load accounts + household members + available months
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts ?? []));

    fetch("/api/household")
      .then((r) => r.json())
      .then((data) => {
        if (data.household?.members) {
          const names: Record<string, string> = {};
          for (const m of data.household.members) {
            names[m.user_id] = m.display_name;
          }
          setMemberNames(names);
        }
      })
      .catch(() => {});
    fetch("/api/months")
      .then((r) => r.json())
      .then((data) => setAvailableMonths(data.months ?? []))
      .catch(() => {});
  }, []);

  // Reset subcategory selection whenever the parent category changes
  useEffect(() => {
    setFilterSubcategory("");
  }, [filterCategory]);

  // Lazy-fetch subcategories scoped to the current view (month + account).
  // Cache per scope so swapping back doesn't refetch.
  const subcatCache = useRef(new Map<string, Subcategory[]>());
  useEffect(() => {
    if (!filterCategory) return;
    const key = `${month}|${filterAccount}`;
    const cached = subcatCache.current.get(key);
    if (cached) {
      setAllSubcategories(cached);
      return;
    }
    setAllSubcategories(null);
    const params = new URLSearchParams({ month });
    if (filterAccount) params.set("account_id", filterAccount);
    fetch(`/api/subcategories?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const subs: Subcategory[] = data.subcategories ?? [];
        subcatCache.current.set(key, subs);
        setAllSubcategories(subs);
      });
  }, [filterCategory, month, filterAccount]);

  // Derive filtered subcategories from the cached full list
  const subcategories = useMemo(
    () => filterCategory && allSubcategories
      ? allSubcategories.filter((s) => s.parent_category === filterCategory)
      : [],
    [allSubcategories, filterCategory],
  );

  // Income cache: month → IncomeEntry[]
  const incomeCache = useRef(new Map<string, IncomeEntry[]>());

  useEffect(() => {
    if (tab !== "income") return;
    const cached = incomeCache.current.get(month);
    if (cached) {
      setIncomeEntries(cached);
      setLoadingIncome(false);
      return;
    }
    setLoadingIncome(true);
    fetch(`/api/income?month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        const entries = data.income ?? [];
        incomeCache.current.set(month, entries);
        setIncomeEntries(entries);
      })
      .finally(() => setLoadingIncome(false));
  }, [tab, month]);

  const refreshIncome = () => {
    incomeCache.current.delete(month);
    fetch(`/api/income?month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        const entries = data.income ?? [];
        incomeCache.current.set(month, entries);
        setIncomeEntries(entries);
      });
  };

  // Client-side cache: "month|category|account" → Expense[]
  const cache = useRef(new Map<string, Expense[]>());

  const cacheKey = `${month}|${filterCategory}|${filterAccount}|${filterSubcategory}`;

  const fetchExpenses = useCallback(
    async (opts?: { invalidate?: boolean }) => {
      const key = `${month}|${filterCategory}|${filterAccount}|${filterSubcategory}`;
      const cached = cache.current.get(key);

      // Show cached data instantly if available
      if (cached && !opts?.invalidate) {
        setExpenses(cached);
        setLoading(false);
        // Revalidate silently in background
        fetchFromApi(key, true);
        return;
      }

      // No cache — show skeleton only on first ever load
      if (!cached) setLoading(true);

      await fetchFromApi(key, false);
    },
    [month, filterCategory, filterAccount, filterSubcategory],
  );

  const fetchFromApi = async (key: string, silent: boolean) => {
    const [m, cat, acct, subcat] = key.split("|");
    const params = new URLSearchParams({ month: m, limit: "50" });
    if (cat) params.set("category", cat);
    if (acct) params.set("account_id", acct);
    if (subcat) params.set("subcategory_id", subcat);

    const res = await fetch(`/api/expenses?${params}`);
    if (res.ok) {
      const data = await res.json();
      cache.current.set(key, data.expenses);
      // Only update UI if we're still on the same key
      if (
        `${month}|${filterCategory}|${filterAccount}|${filterSubcategory}` ===
        key
      ) {
        setExpenses(data.expenses);
      }
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // After creating/editing, invalidate all cache for this month (data changed)
  const invalidateAndRefetch = useCallback(() => {
    // Clear all keys for current month (all category filters)
    for (const key of cache.current.keys()) {
      if (key.startsWith(`${month}|`)) {
        cache.current.delete(key);
      }
    }
    // Subcategory counts are scoped per (month, account) and depend on the
    // expense data that just changed — invalidate matching scopes too.
    for (const key of subcatCache.current.keys()) {
      if (key.startsWith(`${month}|`)) {
        subcatCache.current.delete(key);
      }
    }
    fetchExpenses({ invalidate: true });
  }, [month, fetchExpenses]);

  const [year, monthNum] = month.split("-").map(Number);
  const monthName = new Date(year, monthNum - 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleDeleteExpense = async (id: string, label: string) => {
    // Find the expense data before deleting (for undo re-creation)
    const expenseData = expenses.find((e) => e.id === id);

    // Execute immediately
    setExpenses((e) => e.filter((ex) => ex.id !== id));
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });

    showUndo(`Deleted "${label}"`, async () => {
      // Reverse: re-create the expense
      if (expenseData) {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: expenseData.amount,
            category: expenseData.category,
            merchant: expenseData.merchant,
            note: expenseData.note,
            expense_date: expenseData.expense_date,
            account_id: expenseData.account_id,
          }),
        });
      }
      invalidateAndRefetch();
    });
  };

  const handleDeleteIncome = async (id: string, label: string) => {
    const incomeData = incomeEntries.find((e) => e.id === id);

    // Execute immediately
    setIncomeEntries((e) => e.filter((entry) => entry.id !== id));
    incomeCache.current.delete(month);
    await fetch(`/api/income/${id}`, { method: "DELETE" });

    showUndo(`Deleted "${label}"`, async () => {
      // Reverse: re-create the income
      if (incomeData) {
        await fetch("/api/income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: incomeData.amount,
            source_label: incomeData.source_label,
            note: incomeData.note,
            income_date: incomeData.income_date,
            account_id: incomeData.account_id,
          }),
        });
      }
      refreshIncome();
    });
  };

  return (
    <div className="space-y-6">
      <UndoToastUI />
      {/* Month navigation */}
      <AnimatedSection>
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="rounded-lg px-3 py-2 text-ink-light transition-colors hover:bg-mist/50 hover:text-ink active:scale-95"
          >
            ← Prev
          </button>
          <div className="relative">
            <AnimatedContent transitionKey={month}>
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="font-display text-xl font-light transition-colors hover:text-sage"
              >
                {monthName}
                <span className="ml-1.5 inline-block text-xs text-ink-light">▾</span>
              </button>
            </AnimatedContent>
            {showMonthPicker && availableMonths.length > 1 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMonthPicker(false)} />
                <div className="absolute left-1/2 top-full z-20 mt-2 max-h-64 w-48 -translate-x-1/2 overflow-y-auto rounded-xl border border-sand/50 bg-cream py-1 shadow-lg">
                  {availableMonths.map((m) => {
                    const [y, mn] = m.split("-").map(Number);
                    const label = new Date(y, mn - 1).toLocaleString("en", { month: "long", year: "numeric" });
                    return (
                      <button
                        key={m}
                        onClick={() => { setMonth(m); setShowMonthPicker(false); }}
                        className={`flex w-full px-4 py-2 text-left text-sm transition-colors ${
                          m === month ? "bg-sage/10 text-sage font-medium" : "text-ink hover:bg-mist/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button
            onClick={nextMonth}
            className="rounded-lg px-3 py-2 text-ink-light transition-colors hover:bg-mist/50 hover:text-ink active:scale-95"
          >
            Next →
          </button>
        </div>
      </AnimatedSection>

      {/* Expenses / Income toggle */}
      <AnimatedSection delay={0.03}>
        <div className="relative flex rounded-lg border border-sand/50 p-0.5">
          {/* Sliding pill */}
          <motion.div
            className="absolute inset-0.5 w-[calc(50%-2px)] rounded-md"
            animate={{
              x: tab === "expenses" ? 0 : "100%",
              backgroundColor: tab === "expenses" ? "#2C2825" : "#8B9D83",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          <button
            onClick={() => setTab("expenses")}
            className={`relative z-10 flex-1 rounded-md py-2 text-sm transition-colors duration-200 ${
              tab === "expenses"
                ? "text-cream"
                : "text-ink-light hover:text-ink"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setTab("income")}
            className={`relative z-10 flex-1 rounded-md py-2 text-sm transition-colors duration-200 ${
              tab === "income" ? "text-cream" : "text-ink-light hover:text-ink"
            }`}
          >
            Income
          </button>
        </div>
      </AnimatedSection>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "income" ? (
          <motion.div
            key="income"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-6"
          >
            {/* Account filter for income */}
            {accounts.length > 1 && (
              <AnimatedSection delay={0.03}>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterIncomeAccount("")}
                    className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                      !filterIncomeAccount
                        ? "border-sage bg-sage/10 text-ink"
                        : "border-sand/50 text-ink-light hover:border-sand"
                    }`}
                  >
                    All Accounts
                  </button>
                  {accounts.map((acct) => (
                    <button
                      key={acct.id}
                      onClick={() => setFilterIncomeAccount(filterIncomeAccount === acct.id ? "" : acct.id)}
                      className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                        filterIncomeAccount === acct.id
                          ? "border-sage bg-sage/10 text-ink"
                          : "border-sand/50 text-ink-light hover:border-sand"
                      }`}
                    >
                      {acct.name}
                    </button>
                  ))}
                </div>
              </AnimatedSection>
            )}

            {/* Add income button */}
            <AnimatedSection delay={0.05}>
              <button
                onClick={() => setShowIncomeForm(true)}
                className="w-full rounded-xl border-2 border-dashed border-sage/50 py-3 text-sm text-sage transition-colors hover:border-sage hover:bg-sage/5"
              >
                + Add Income
              </button>
            </AnimatedSection>

            {/* Add income form */}
            {showIncomeForm && (
              <AnimatedSection>
                <div className="rounded-2xl border border-sand/50 bg-cream p-4">
                  <IncomeForm
                    onSave={() => {
                      setShowIncomeForm(false);
                      refreshIncome();
                    }}
                    onCancel={() => setShowIncomeForm(false)}
                  />
                </div>
              </AnimatedSection>
            )}

            {/* Income list */}
            <AnimatedContent
              transitionKey={`income-${month}-${filterIncomeAccount}`}
              className="space-y-3"
            >
              {loadingIncome ? (
                <>
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl bg-mist/50"
                    />
                  ))}
                </>
              ) : (() => {
                const filtered = filterIncomeAccount
                  ? incomeEntries.filter((e) => e.account_id === filterIncomeAccount)
                  : incomeEntries;
                return filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-light">
                  No income for this period.
                </p>
              ) : (
                filtered.map((entry, i) => (
                  <AnimatedSection key={entry.id} delay={i * 0.03}>
                    <IncomeCard
                      income={{
                        ...entry,
                        account_name: accounts.find((a) => a.id === entry.account_id)?.name,
                      }}
                      isEditing={editingIncomeId === entry.id}
                      onEditStart={() => { setEditingIncomeId(entry.id); setShowIncomeForm(false); }}
                      onEditEnd={() => setEditingIncomeId(null)}
                      onUpdate={refreshIncome}
                      onDelete={() => handleDeleteIncome(entry.id, entry.source_label || "Income")}
                      showAccount={accounts.length > 1}
                      loggedByName={
                        Object.keys(memberNames).length > 1 &&
                        entry.created_by
                          ? memberNames[entry.created_by]
                          : undefined
                      }
                    />
                  </AnimatedSection>
                ))
              );
              })()}
            </AnimatedContent>
          </motion.div>
        ) : (
          <motion.div
            key="expenses"
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-6"
          >
            {/* Account filter */}
            {accounts.length > 1 && (
              <AnimatedSection delay={0.05}>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterAccount("")}
                    className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                      !filterAccount
                        ? "border-sage bg-sage/10 text-ink"
                        : "border-sand/50 text-ink-light hover:border-sand"
                    }`}
                  >
                    All Accounts
                  </button>
                  {accounts.map((acct) => (
                    <button
                      key={acct.id}
                      onClick={() =>
                        setFilterAccount(
                          filterAccount === acct.id ? "" : acct.id,
                        )
                      }
                      className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                        filterAccount === acct.id
                          ? "border-sage bg-sage/10 text-ink"
                          : "border-sand/50 text-ink-light hover:border-sand"
                      }`}
                    >
                      {acct.name}
                    </button>
                  ))}
                </div>
              </AnimatedSection>
            )}

            {/* Category filter */}
            <AnimatedSection delay={accounts.length > 1 ? 0.1 : 0.05}>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterCategory("")}
                  className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
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
                    className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
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

            {/* Subcategory filter — visible only when a category is selected */}
            {filterCategory && (
              <AnimatedSection delay={accounts.length > 1 ? 0.15 : 0.1}>
                <div className="flex flex-wrap gap-2">
                  {allSubcategories === null ? (
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-mist/50" />
                  ) : (
                    <>
                      <button
                        onClick={() => setFilterSubcategory("")}
                        className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                          !filterSubcategory
                            ? "border-sage bg-sage/10 text-ink"
                            : "border-sand/50 text-ink-light hover:border-sand"
                        }`}
                      >
                        All
                      </button>
                      {subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() =>
                            setFilterSubcategory(
                              filterSubcategory === sub.id ? "" : sub.id,
                            )
                          }
                          className={`rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                            filterSubcategory === sub.id
                              ? "border-sage bg-sage/10 text-ink"
                              : "border-sand/50 text-ink-light hover:border-sand"
                          }`}
                        >
                          {sub.name}
                          {sub.expense_count > 0 && (
                            <span className="ml-1 text-ink-light/60">
                              ({sub.expense_count})
                            </span>
                          )}
                        </button>
                      ))}
                      {subcategories.length === 0 && (
                        <span className="px-2 py-1.5 text-xs text-ink-light">
                          No subcategories for {filterCategory}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </AnimatedSection>
            )}

            {/* Add expense button */}
            <AnimatedSection delay={0.1}>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                }}
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
                      invalidateAndRefetch();
                    }}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              </AnimatedSection>
            )}

            {/* Expense list — animates on month/filter change */}
            <AnimatedContent transitionKey={cacheKey} className="space-y-3">
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
                expenses.map((expense, i) => {
                  const acct = accounts.find(
                    (a) => a.id === expense.account_id,
                  );
                  return (
                    <AnimatedSection key={expense.id} delay={i * 0.03}>
                      <ExpenseCard
                        expense={{ ...expense, account_name: acct?.name }}
                        isEditing={editingId === expense.id}
                        onEditStart={() => {
                          setEditingId(expense.id);
                          setShowForm(false);
                        }}
                        onEditEnd={() => setEditingId(null)}
                        onUpdate={invalidateAndRefetch}
                        onDelete={() => handleDeleteExpense(expense.id, expense.merchant || expense.category)}
                        showAccount={accounts.length > 1}
                        loggedByName={
                          Object.keys(memberNames).length > 1 &&
                          expense.created_by
                            ? memberNames[expense.created_by]
                            : undefined
                        }
                      />
                    </AnimatedSection>
                  );
                })
              )}
            </AnimatedContent>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
