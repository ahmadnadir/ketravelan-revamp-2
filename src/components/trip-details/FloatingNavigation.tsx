import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FloatingNavigationProps {
  title: string;
  backLink: string;
  backLabel: string;
  rightActions: React.ReactNode;
  visible: boolean;
  opacity: number;
  translateY: number;
  scale: number;
  blurPx: number;
  shadowOpacity: number;
}

export function FloatingNavigation({
  title,
  backLink,
  backLabel,
  rightActions,
  visible,
  opacity,
  translateY,
  scale,
  blurPx,
  shadowOpacity,
}: FloatingNavigationProps) {
  const resolvedOpacity = visible ? opacity : 0;
  const resolvedTranslateY = visible ? translateY : -16;
  const resolvedScale = visible ? scale : 0.98;

  return (
    <div
      className="fixed inset-x-0 z-[80] px-4 md:hidden pointer-events-none"
      style={{
        top: "calc(var(--header-total-height) + 0.75rem)",
      }}
      aria-hidden={!visible}
    >
      <div
        className={cn(
          "mx-auto max-w-[calc(100%-0.25rem)] rounded-[22px] border border-white/50 bg-white/70 px-3 py-2",
          visible ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{
          opacity: resolvedOpacity,
          transform: `translateY(${resolvedTranslateY}px) scale(${resolvedScale})`,
          backdropFilter: `blur(${blurPx}px)`,
          WebkitBackdropFilter: `blur(${blurPx}px)`,
          boxShadow: `0 10px 28px rgba(15, 23, 42, ${shadowOpacity})`,
          transition:
            "opacity 250ms cubic-bezier(0.2,0.8,0.2,1), transform 250ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 250ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              to={backLink}
              aria-label={backLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/85"
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
