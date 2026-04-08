"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import HouseholdSetup from "@/components/household/household-setup";
import InviteLink from "@/components/household/invite-link";
import AnimatedSection from "@/components/ui/animated-section";

interface HouseholdMember {
  user_id: string;
  display_name: string;
  role: string;
}

interface Household {
  id: string;
  name: string;
  created_at: string;
  members: HouseholdMember[];
}

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const joinAttempted = useRef(false);

  const fetchHousehold = useCallback(async () => {
    const res = await fetch("/api/household");
    if (res.ok) {
      const data = await res.json();
      setHousehold(data.household);
      if (data.current_user_id) setCurrentUserId(data.current_user_id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  // Auto-join if token in URL (runs once)
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token || joinAttempted.current) return;
    joinAttempted.current = true;

    const joinHousehold = async () => {
      setJoining(true);
      setJoinError(null);
      // Always clear token from URL immediately to prevent re-attempts
      window.history.replaceState({}, "", "/dashboard/household");
      try {
        const res = await fetch("/api/household/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to join");
        }
        fetchHousehold();
      } catch (err) {
        setJoinError(err instanceof Error ? err.message : "Failed to join");
        // Still fetch — user might already be in the household (409)
        fetchHousehold();
      } finally {
        setJoining(false);
      }
    };

    joinHousehold();
  }, [searchParams, fetchHousehold]);

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this household?")) return;
    setLeaving(true);
    try {
      const res = await fetch("/api/household/leave", { method: "POST" });
      if (res.ok) {
        setHousehold(null);
      }
    } finally {
      setLeaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this household? All members will be removed.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/household", { method: "DELETE" });
      if (res.ok) {
        setHousehold(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-mist/50" />
        <div className="h-32 animate-pulse rounded-2xl bg-mist/50" />
      </div>
    );
  }

  if (joining) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-light">Household</h1>
        <div className="rounded-2xl border border-sand/50 bg-cream p-6 text-center">
          <p className="text-sm text-ink-light">Joining household...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="space-y-6">
        <AnimatedSection>
          <h1 className="font-display text-2xl font-light">Household</h1>
        </AnimatedSection>
        {joinError && (
          <AnimatedSection delay={0.05}>
            <p className="rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm text-terracotta">
              {joinError}
            </p>
          </AnimatedSection>
        )}
        <AnimatedSection delay={0.1}>
          <HouseholdSetup onCreated={fetchHousehold} />
        </AnimatedSection>
      </div>
    );
  }

  const isOwner = household.members.some(
    (m) => m.user_id === currentUserId && m.role === "owner"
  );

  return (
    <div className="space-y-6">
      <AnimatedSection>
        <h1 className="font-display text-2xl font-light">{household.name}</h1>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-ink-light">Members</h2>
          {household.members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between rounded-xl border border-sand/30 bg-cream/30 px-4 py-3"
            >
              <div>
                <p className="font-medium">{member.display_name}</p>
                <p className="text-xs text-ink-light capitalize">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {isOwner && household.members.length < 2 && (
        <AnimatedSection delay={0.2}>
          <InviteLink />
        </AnimatedSection>
      )}

      <AnimatedSection delay={0.3}>
        {isOwner ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full rounded-xl border border-terracotta/30 py-3 text-sm text-terracotta transition-colors hover:bg-terracotta/5 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Household"}
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="w-full rounded-xl border border-terracotta/30 py-3 text-sm text-terracotta transition-colors hover:bg-terracotta/5 disabled:opacity-50"
          >
            {leaving ? "Leaving..." : "Leave Household"}
          </button>
        )}
      </AnimatedSection>
    </div>
  );
}
