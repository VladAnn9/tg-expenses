"use client";

import { useMemo, useSyncExternalStore } from "react";

export function useIsMobile(breakpoint = 639) {
  const mq = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia(`(max-width: ${breakpoint}px)`)
        : null,
    [breakpoint],
  );

  const subscribe = (cb: () => void) => {
    if (!mq) return () => {};
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };

  return useSyncExternalStore(
    subscribe,
    () => mq?.matches ?? false,
    () => false,
  );
}
