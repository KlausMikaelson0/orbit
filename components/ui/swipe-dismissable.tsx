"use client";

import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface SwipeDismissableProps {
  direction: "right" | "down";
  onDismiss: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SwipeDismissable({
  direction,
  onDismiss,
  children,
  className,
}: SwipeDismissableProps) {
  const [offset, setOffset] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const threshold = 96;

  const style = useMemo(
    () =>
      direction === "right"
        ? { transform: `translateX(${Math.max(0, offset)}px)` }
        : { transform: `translateY(${Math.max(0, offset)}px)` },
    [direction, offset],
  );

  return (
    <div
      className={cn("transition-transform duration-150 ease-out", className)}
      onTouchEnd={() => {
        if (offset >= threshold) {
          onDismiss();
        }
        setOffset(0);
        touchStartRef.current = null;
      }}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (!touchStartRef.current || !touch) {
          return;
        }
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;

        if (direction === "right") {
          if (Math.abs(dx) > Math.abs(dy) && dx > 0) {
            setOffset(dx);
          }
        } else {
          if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
            setOffset(dy);
          }
        }
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) {
          return;
        }
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }}
      style={style}
    >
      {children}
    </div>
  );
}
