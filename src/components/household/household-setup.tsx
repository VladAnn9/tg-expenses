"use client";

import { useState } from "react";

interface HouseholdSetupProps {
  onCreated: () => void;
}

export default function HouseholdSetup({ onCreated }: HouseholdSetupProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create household");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-sand/50 bg-cream p-6 text-center">
      <h2 className="font-display text-xl font-light">Create a Household</h2>
      <p className="mt-2 text-sm text-ink-light">
        Share expenses with your partner. Up to 2 members.
      </p>
      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Our Household"
          className="flex-1 rounded-lg border border-sand bg-cream/50 px-4 py-3 text-ink focus:border-sage focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-xl bg-ink px-6 py-3 text-cream transition-all hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-terracotta">{error}</p>}
    </div>
  );
}
