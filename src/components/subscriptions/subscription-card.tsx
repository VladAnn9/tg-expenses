"use client";

import { useState } from "react";
import type { SubscriptionFrequency, SubscriptionStatus } from "@/types/database";

interface Subscription {
  id: string;
  merchant: string;
  amount: number;
  frequency: SubscriptionFrequency;
  next_expected: string;
  status: SubscriptionStatus;
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onStatusChange: () => void;
}

const FREQUENCY_LABEL: Record<SubscriptionFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function SubscriptionCard({
  subscription,
  onStatusChange,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

  const isSuggested = subscription.status === "suggested";
  const borderColor = isSuggested ? "border-terracotta/40" : "border-sage/40";

  const handleAction = async (newStatus: "confirmed" | "dismissed") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onStatusChange();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-xl border ${borderColor} bg-cream/30 p-4 transition-colors`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-medium truncate">{subscription.merchant}</p>
          <p className="text-xs text-ink-light">
            {FREQUENCY_LABEL[subscription.frequency]} &middot; Next:{" "}
            {subscription.next_expected}
          </p>
        </div>
        <p className="font-display text-lg font-light flex-shrink-0 ml-3">
          {Number(subscription.amount).toFixed(2)}
          <span className="ml-1 text-xs text-ink-light">PLN</span>
        </p>
      </div>

      {isSuggested && (
        <div className="mt-3 flex gap-2 border-t border-sand/20 pt-3">
          <button
            onClick={() => handleAction("confirmed")}
            disabled={loading}
            className="flex-1 rounded-lg bg-sage/10 py-2 text-sm text-sage transition-colors hover:bg-sage/20 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => handleAction("dismissed")}
            disabled={loading}
            className="flex-1 rounded-lg bg-terracotta/10 py-2 text-sm text-terracotta transition-colors hover:bg-terracotta/20 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      )}

      {!isSuggested && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sage" />
          <span className="text-xs text-sage">Active</span>
        </div>
      )}
    </div>
  );
}
