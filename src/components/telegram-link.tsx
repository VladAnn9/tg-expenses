"use client";

import { useState } from "react";

export default function TelegramLink() {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate link");
      const data = await res.json();
      setLink(data.link);
    } catch {
      setError("Could not generate link. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (link) {
    return (
      <div className="mt-4 space-y-3">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 text-cream transition-all hover:bg-ink/90 active:scale-[0.98]"
        >
          Open in Telegram
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(link)}
          className="w-full rounded-xl border border-sand px-6 py-3 text-sm text-ink-light transition-colors hover:bg-mist/50"
        >
          Copy link
        </button>
        <p className="text-center text-xs text-ink-light">
          Link expires in 15 minutes
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleLink}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 text-cream transition-all hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Generating link..." : "Link Telegram"}
      </button>
      {error && <p className="mt-2 text-center text-sm text-terracotta">{error}</p>}
    </div>
  );
}
