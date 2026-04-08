"use client";

import { useState } from "react";

export default function InviteLink() {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInvite = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/household/invite", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate invite");
      }
      const data = await res.json();
      setLink(data.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {!link ? (
        <button
          onClick={generateInvite}
          disabled={loading}
          className="w-full rounded-xl border-2 border-dashed border-sand py-3 text-sm text-ink-light transition-colors hover:border-sage hover:text-ink disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Invite Link"}
        </button>
      ) : (
        <div className="rounded-xl border border-sand/50 bg-mist/30 p-4">
          <p className="text-xs text-ink-light">Share this link (expires in 48h):</p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={link}
              readOnly
              className="flex-1 min-w-0 rounded-lg border border-sand bg-cream/50 px-3 py-2 text-xs text-ink"
            />
            <button
              onClick={copyToClipboard}
              className="rounded-lg bg-ink px-4 py-2 text-xs text-cream transition-all hover:bg-ink/90 active:scale-[0.98]"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-terracotta">{error}</p>}
    </div>
  );
}
