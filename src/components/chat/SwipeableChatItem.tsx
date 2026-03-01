import { useState, useRef, ReactNode } from "react";
import { Trash2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableChatItemProps {
  children: ReactNode;
  onDelete: () => void;
  onMarkAsRead: () => void;
  hasUnread: boolean;
  allowDelete?: boolean;
}

export function SwipeableChatItem({
  children,
  onDelete,
  onMarkAsRead,
  hasUnread,
  allowDelete = true,
}: SwipeableChatItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<"horizontal" | "vertical" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 80;
  const DRAG_START = 8;
  const SNAP_OFFSET = 88;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
    dragModeRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diff = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    if (!dragModeRef.current) {
      const absX = Math.abs(diff);
      const absY = Math.abs(diffY);
      if (absX < DRAG_START && absY < DRAG_START) return;
      dragModeRef.current = absX > absY ? "horizontal" : "vertical";
    }

    if (dragModeRef.current === "vertical") return;

    const maxSwipe = 100;
    const clampedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));

    if (diff > 0 && !hasUnread) {
      setOffsetX(0);
      return;
    }

    if (diff < 0 && !allowDelete) {
      setOffsetX(0);
      return;
    }

    setOffsetX(clampedDiff);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    dragModeRef.current = null;

    if (offsetX < -THRESHOLD && allowDelete) {
      setOffsetX(-SNAP_OFFSET);
      return;
    }

    if (offsetX > THRESHOLD && hasUnread) {
      onMarkAsRead();
      setOffsetX(0);
      return;
    }

    setOffsetX(0);
  };

  const handleContentClick = () => {
    if (offsetX !== 0) {
      setOffsetX(0);
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg first:mt-3">
      {/* Delete action (left swipe) */}
      {allowDelete && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-destructive text-destructive-foreground"
          style={{ width: Math.max(0, -offsetX) }}
        >
          {offsetX < -40 && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-2 text-sm font-medium"
            >
              Delete
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Mark as read action (right swipe) */}
      {hasUnread && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-green-500 text-white"
          style={{ width: Math.max(0, offsetX) }}
        >
          <CheckCheck className="h-5 w-5" />
        </div>
      )}

      {/* Main content */}
      <div
        className="relative bg-background transition-transform duration-75"
        style={{ transform: `translateX(${offsetX}px)`, touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Escape" && offsetX !== 0) setOffsetX(0);
        }}
      >
        {children}
      </div>
    </div>
  );
}
