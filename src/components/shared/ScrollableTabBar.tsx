import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollableTabBarProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ScrollableTabBar({
  options,
  value,
  onChange,
  className,
}: ScrollableTabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [showLeftHint, setShowLeftHint] = useState(false);

  // Scroll a specific tab into view (centered if possible)
  const scrollToTab = useCallback((tabValue: string) => {
    const container = scrollRef.current;
    const tab = tabRefs.current.get(tabValue);
    
    if (!container || !tab) return;
    
    // Calculate scroll position to center the tab
    const tabCenter = tab.offsetLeft + tab.offsetWidth / 2;
    const containerCenter = container.clientWidth / 2;
    const scrollTarget = tabCenter - containerCenter;
    
    container.scrollTo({
      left: Math.max(0, scrollTarget),
      behavior: "smooth"
    });
  }, []);

  // Handle scroll position to update hints
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const isAtEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10;
    const isAtStart = el.scrollLeft <= 10;
    
    setShowScrollHint(!isAtEnd);
    setShowLeftHint(!isAtStart);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial check
    handleScroll();

    // Also check on resize
    const handleResize = () => handleScroll();

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [handleScroll]);

  // Auto-scroll to active tab on mount and when value changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToTab(value);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [value, scrollToTab]);

  const handleTabClick = (tabValue: string) => {
    onChange(tabValue);
    scrollToTab(tabValue);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Left edge fade gradient */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-10 pointer-events-none transition-opacity duration-300 rounded-l-xl z-10",
          "bg-gradient-to-r from-secondary to-transparent",
          showLeftHint ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Left chevron hint */}
      <div
        className={cn(
          "absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 z-10",
          showLeftHint ? "opacity-50" : "opacity-0"
        )}
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto p-1 bg-secondary rounded-xl scrollbar-hide"
        style={{ 
          scrollbarWidth: "none", 
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain"
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            ref={(el) => {
              if (el) tabRefs.current.set(option.value, el);
            }}
            onClick={() => handleTabClick(option.value)}
            className={cn(
              "min-h-[44px] px-4 text-sm font-medium rounded-lg whitespace-nowrap transition-all flex items-center justify-center",
              value === option.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Right edge fade gradient */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-10 pointer-events-none transition-opacity duration-300 rounded-r-xl",
          "bg-gradient-to-l from-secondary to-transparent",
          showScrollHint ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Right chevron hint */}
      <div
        className={cn(
          "absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300",
          showScrollHint ? "opacity-50" : "opacity-0"
        )}
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
