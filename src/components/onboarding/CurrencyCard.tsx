import { cn } from "@/lib/utils";
import { CurrencyCode } from "@/lib/currencyUtils";

interface CurrencyCardProps {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  isSelected: boolean;
  onSelect: () => void;
}

export function CurrencyCard({
  code,
  symbol,
  name,
  flag,
  isSelected,
  onSelect,
}: CurrencyCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <svg
            className="h-3 w-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Flag emoji */}
      <span className="text-3xl mb-2">{flag}</span>

      {/* Currency symbol */}
      <span className="text-xl font-bold text-foreground">{symbol}</span>

      {/* Currency code */}
      <span className="text-sm font-medium text-foreground mt-1">{code}</span>

      {/* Currency name */}
      <span className="text-xs text-muted-foreground mt-0.5 text-center leading-tight">
        {name}
      </span>
    </button>
  );
}

// Currency data with flags
export const currencyData: {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
}[] = [
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", flag: "🇮🇩" },
];
