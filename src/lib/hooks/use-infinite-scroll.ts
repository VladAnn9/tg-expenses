"use client";

import { useEffect, useRef } from "react";

/**
 * Observes a sentinel element and calls `onIntersect` when it enters the
 * viewport. The observer reconnects whenever `enabled` flips back on, so a
 * sentinel that is still visible after new content is appended fires again.
 */
export function useInfiniteScroll(
  onIntersect: () => void,
  { enabled, rootMargin = "200px" }: { enabled: boolean; rootMargin?: string },
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!enabled || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onIntersectRef.current();
        }
      },
      { rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
