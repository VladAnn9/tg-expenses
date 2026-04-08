"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

interface UndoToastProps {
  message: string;
  duration?: number;
  onUndo: () => void | Promise<void>;
  onExpire: () => void;
}

export default function UndoToast({
  message,
  duration = 15000,
  onUndo,
  onExpire,
}: UndoToastProps) {
  const [remaining, setRemaining] = useState(duration);
  const [undoing, setUndoing] = useState(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 100;
        if (next <= 0) {
          clearInterval(interval);
          // Defer to avoid setState-during-render
          setTimeout(() => expireRef.current(), 0);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleUndo = useCallback(async () => {
    setUndoing(true);
    await onUndo();
  }, [onUndo]);

  const progress = remaining / duration;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md -translate-x-1/2"
    >
      <div className="rounded-xl border border-sand/50 bg-ink px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm text-cream/90 truncate">
            {message}
          </p>
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="flex-shrink-0 rounded-lg bg-cream/10 px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-cream/20 active:scale-95 disabled:opacity-50"
          >
            {undoing ? "Undoing..." : "Undo"}
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-cream/10">
          <motion.div
            className="h-full rounded-full bg-sage/70"
            initial={{ width: "100%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Hook for managing undo state
export function useUndoToast() {
  const [toast, setToast] = useState<{
    message: string;
    onUndo: () => void | Promise<void>;
  } | null>(null);

  const showUndo = useCallback(
    (message: string, onUndo: () => void | Promise<void>) => {
      setToast({ message, onUndo });
    },
    []
  );

  const dismiss = useCallback(() => setToast(null), []);

  const UndoToastUI = useCallback(() => {
    return (
      <AnimatePresence>
        {toast && (
          <UndoToast
            key={toast.message}
            message={toast.message}
            onUndo={async () => {
              await toast.onUndo();
              setToast(null);
            }}
            onExpire={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    );
  }, [toast]);

  return { showUndo, dismiss, UndoToastUI };
}
