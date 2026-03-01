import { ArrowLeftRight } from "lucide-react";
import { CurrencyCode, getCurrencySymbol } from "@/lib/currencyUtils";
import { CurrencyViewMode } from "@/hooks/useCurrencyViewPreference";
import { cn } from "@/lib/utils";

interface CurrencyLensToggleProps {
  travelCurrency: CurrencyCode;
  homeCurrency: CurrencyCode;
  viewMode: CurrencyViewMode;
  onToggle: () => void;
  className?: string;
}

export function CurrencyLensToggle({
  travelCurrency,
  homeCurrency,
  viewMode,
  onToggle,
  className,
}: CurrencyLensToggleProps) {
  const travelSymbol = getCurrencySymbol(travelCurrency);
  const homeSymbol = getCurrencySymbol(homeCurrency);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-xs",
        "text-muted-foreground hover:text-foreground",
        "bg-secondary/50 hover:bg-secondary rounded-lg",
        "transition-colors duration-150",
        className
      )}
      aria-label={`Switch to ${viewMode === "travel" ? "home" : "travel"} currency`}
    >
      <span className={cn(
        "transition-all duration-150",
        viewMode === "travel" ? "font-semibold text-foreground" : "opacity-70"
      )}>
        {travelSymbol}
      </span>
      <ArrowLeftRight className="h-3 w-3 opacity-60" />
      <span className={cn(
        "transition-all duration-150",
        viewMode === "home" ? "font-semibold text-foreground" : "opacity-70"
      )}>
        {homeSymbol}
      </span>
    </button>
  );
}
