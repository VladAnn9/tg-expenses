"use client";

import { useRef } from "react";
import { motion, useMotionValue, useAnimation, type PanInfo } from "motion/react";
import { TrashIcon } from "@/components/ui/icons";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onClick: () => void;
  className?: string;
}

export default function SwipeableCard({
  children,
  onDelete,
  onClick,
  className = "",
}: SwipeableCardProps) {
  const dragX = useMotionValue(0);
  const controls = useAnimation();
  const isDragging = useRef(false);
  const isMobile = useIsMobile();

  const canSwipe = !!onDelete && isMobile;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    isDragging.current = false;
    if (info.offset.x < -80 && onDelete) {
      controls.start({ x: -100, transition: { type: "spring", stiffness: 300, damping: 25 } });
      onDelete();
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 25 } });
    }
  };

  const handleClick = () => {
    if (!isDragging.current) onClick();
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe-to-delete background — mobile only */}
      {canSwipe && (
        <div className="absolute inset-y-0 right-0 flex items-center gap-2 rounded-r-xl bg-terracotta/90 px-6 text-cream">
          <TrashIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Delete</span>
        </div>
      )}

      <motion.div
        drag={canSwipe ? "x" : false}
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x: dragX }}
        className={`relative cursor-pointer rounded-xl ${className}`}
        onClick={handleClick}
      >
        {children}
      </motion.div>
    </div>
  );
}
