import { ReactNode, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

interface SwipeableNotificationItemProps {
  children: ReactNode;
  onDismiss: () => void;
  onMarkAsRead: () => void;
  isUnread: boolean;
}

export function SwipeableNotificationItem({
  children,
  onDismiss,
  onMarkAsRead,
  isUnread,
}: SwipeableNotificationItemProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const dragMode = useRef<"horizontal" | "vertical" | null>(null);

  const THRESHOLD = 80;
  const DRAG_START = 8;
  const SNAP_OFFSET = 88;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    dragMode.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diff = currentX - startX.current;
    const diffY = currentY - startY.current;

    if (!dragMode.current) {
      const absX = Math.abs(diff);
      const absY = Math.abs(diffY);
      if (absX < DRAG_START && absY < DRAG_START) return;
      dragMode.current = absX > absY ? "horizontal" : "vertical";
    }

    if (dragMode.current === "vertical") return;
    
    // Limit the swipe distance
    const maxOffset = 100;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
    setOffset(clampedOffset);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    dragMode.current = null;
    
    if (offset < -THRESHOLD) {
      setOffset(-SNAP_OFFSET);
      return;
    }

    if (offset > THRESHOLD) {
      setOffset(SNAP_OFFSET);
      return;
    }

    setOffset(0);
  };

  const handleDelete = () => {
    onDismiss();
  };

  const handleContentClick = () => {
    if (offset !== 0) {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl first:mt-3">
      {/* Left action - Delete (shown when swiping right) */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-destructive text-destructive-foreground"
        style={{ width: Math.max(0, offset) }}
      >
        {offset > 40 && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Trash2 className="h-5 w-5" />
            Delete
          </button>
        )}
      </div>

      {/* Right action - Delete (shown when swiping left) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-destructive text-destructive-foreground"
        style={{ width: Math.max(0, -offset) }}
      >
        {offset < -40 && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 text-sm font-medium"
          >
            Delete
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Main content */}
      <div
        className="relative bg-white dark:bg-card rounded-xl transition-transform duration-75"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Escape" && offset !== 0) setOffset(0);
        }}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
      >
        {children}
      </div>
    </div>
  );
}
