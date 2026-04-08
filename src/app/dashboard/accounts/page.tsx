"use client";

import { useState, useEffect, useCallback } from "react";
import AccountCard from "@/components/accounts/account-card";
import AccountForm from "@/components/accounts/account-form";
import AnimatedSection from "@/components/ui/animated-section";
import type { AccountType } from "@/types/database";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSetPrimary = async (id: string) => {
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_primary: true }),
    });
    fetchAccounts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this account? Expenses must be reassigned first.")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to delete");
      return;
    }
    fetchAccounts();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-mist/50" />
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-mist/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatedSection>
        <h1 className="font-display text-2xl font-light">Accounts</h1>
      </AnimatedSection>

      <AnimatedSection delay={0.05}>
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border-2 border-dashed border-sand py-3 text-sm text-ink-light transition-colors hover:border-sage hover:text-ink"
        >
          + Add Account
        </button>
      </AnimatedSection>

      {showForm && (
        <AnimatedSection>
          <div className="rounded-2xl border border-sand/50 bg-cream p-4">
            <AccountForm
              onSave={() => {
                setShowForm(false);
                fetchAccounts();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </AnimatedSection>
      )}

      <div className="space-y-3">
        {accounts.map((account, i) => (
          <AnimatedSection key={account.id} delay={0.1 + i * 0.03}>
            <div className="relative">
              <AccountCard account={account} onUpdate={fetchAccounts} />
              <div className="mt-2 flex gap-2">
                {!account.is_primary && (
                  <>
                    <button
                      onClick={() => handleSetPrimary(account.id)}
                      className="rounded-lg px-3 py-1 text-xs text-ink-light transition-colors hover:bg-mist/50 hover:text-ink"
                    >
                      Set as Primary
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="rounded-lg px-3 py-1 text-xs text-terracotta/70 transition-colors hover:bg-terracotta/5 hover:text-terracotta"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
}
