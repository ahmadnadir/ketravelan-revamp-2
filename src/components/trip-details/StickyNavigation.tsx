import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StickyNavigationProps {
  title: string;
  backLink: string;
  backLabel: string;
  rightActions: React.ReactNode;
  visible: boolean;
}

export function StickyNavigation({
  title,
  backLink,
  backLabel,
  rightActions,
  visible,
}: StickyNavigationProps) {
  return (
    <div
      className="fixed inset-x-0 z-[82] px-4 md:hidden pointer-events-none"
      style={{ top: "env(safe-area-inset-top)" }}
      aria-hidden={!visible}
    >
      <div
        className={cn(
          "mx-auto rounded-[18px] border border-border/40 bg-background/95 px-3 py-2 backdrop-blur-xl",
          visible ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{
          opacity: visible ? 1 : 0,
          transform: `translateY(${visible ? 0 : -20}px) scale(${visible ? 1 : 0.98})`,
          transition:
            "opacity 250ms cubic-bezier(0.2,0.8,0.2,1), transform 250ms cubic-bezier(0.2,0.8,0.2,1)",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.14)",
        }}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              to={backLink}
              aria-label={backLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </Link>
            <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">{rightActions}</div>
        </div>
      </div>
    </div>
  );
}
