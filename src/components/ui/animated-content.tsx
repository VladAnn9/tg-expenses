"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

interface AnimatedContentProps {
  /** Change this key to trigger the exit/enter transition */
  transitionKey: string;
  children: ReactNode;
  className?: string;
}

export default function AnimatedContent({
  transitionKey,
  children,
  className,
}: AnimatedContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{
          duration: 0.25,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
