import { Coins, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { getCurrencyInfo, type CurrencyCode } from "@/lib/currencyUtils";
import { formatBudgetRange, isDefaultBudgetRange } from "./BudgetTierSelector";
import type { TripCategoryId } from "@/data/categories";

interface AppliedFiltersBarProps {
  destination: string;
  dates: DateRange | undefined;
  flexibleDates: boolean;
  budgetRange: [number, number];
  categories: TripCategoryId[];
  currency?: string;
  onClear: () => void;
  onEdit: () => void;
}

export function AppliedFiltersBar({
  destination,
  dates,
  flexibleDates,
  budgetRange,
  categories,
  currency,
  onClear,
  onEdit,
}: AppliedFiltersBarProps) {
  const hasFilters = destination || dates?.from || flexibleDates || !isDefaultBudgetRange(budgetRange) || categories.length > 0 || (currency && currency !== "MYR");

  if (!hasFilters) return null;

  const chips: Array<{ label: string; icon?: "currency" }> = [];

  if (destination) {
    chips.push({ label: destination });
  }

  if (flexibleDates) {
    chips.push({ label: "Flexible dates" });
  } else if (dates?.from) {
    if (dates.to) {
      chips.push({ label: `${format(dates.from, "MMM d")} – ${format(dates.to, "MMM d")}` });
    } else {
      chips.push({ label: format(dates.from, "MMM d") });
    }
  }

  if (!isDefaultBudgetRange(budgetRange)) {
    chips.push({ label: formatBudgetRange(budgetRange, (currency || "MYR") as CurrencyCode) });
  }

  if (currency && currency !== "MYR") {
    const currencyInfo = getCurrencyInfo(currency as Parameters<typeof getCurrencyInfo>[0]);
    chips.push({ label: currencyInfo ? `${currencyInfo.flag} ${currencyInfo.code}` : currency, icon: "currency" });
  }

  if (categories.length > 0) {
    chips.push({ label: `${categories.length} style${categories.length > 1 ? "s" : ""}` });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map((chip, index) => (
        <button
          key={index}
          onClick={onEdit}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            "bg-primary/10 text-primary border border-primary/20",
            "hover:bg-primary/15 transition-colors"
          )}
        >
          {chip.icon === "currency" && <Coins className="h-3.5 w-3.5" />}
          {chip.label}
        </button>
      ))}
      <button
        onClick={onClear}
        className="p-1.5 rounded-full hover:bg-secondary transition-colors"
        aria-label="Clear all filters"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
