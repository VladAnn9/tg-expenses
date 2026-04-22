"use client";

import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface WordStaggerProps {
  text: string;
  className?: string;
  wordClassName?: string;
  baseDelay?: number;
  perWord?: number;
  whileInView?: boolean;
}

export default function WordStagger({
  text,
  className = "",
  wordClassName = "",
  baseDelay = 0,
  perWord = 0.04,
  whileInView = false,
}: WordStaggerProps) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: perWord, delayChildren: baseDelay },
    },
  };

  const word: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] },
    },
  };

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      animate={whileInView ? undefined : "visible"}
      whileInView={whileInView ? "visible" : undefined}
      viewport={whileInView ? { once: true, amount: 0.4 } : undefined}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          variants={word}
          className={`inline-block ${wordClassName}`}
          style={{ willChange: "transform, opacity" }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}
