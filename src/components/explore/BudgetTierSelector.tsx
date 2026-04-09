import { Slider } from "@/components/ui/slider";
import { conversionRatesToMYR, getCurrencySymbol, type CurrencyCode } from "@/lib/currencyUtils";

interface BudgetRangeSelectorProps {
  value: [number, number];
  onChange: (range: [number, number]) => void;
  currency?: CurrencyCode;
}

function convertBudgetFromMYR(priceInMYR: number, currency: CurrencyCode): number {
  if (currency === "MYR") return priceInMYR;
  const rateToMYR = conversionRatesToMYR[currency] || 1;
  return Math.round(priceInMYR / rateToMYR);
}

function roundBudgetDisplayValue(value: number): number {
  if (value <= 0) return 0;
  if (value < 1000) return Math.round(value / 100) * 100;
  if (value < 10000) return Math.round(value / 500) * 500;
  if (value < 100000) return Math.round(value / 1000) * 1000;
  if (value < 1000000) return Math.round(value / 5000) * 5000;
  return Math.round(value / 10000) * 10000;
}

function formatBudgetPrice(priceInMYR: number, currency: CurrencyCode): string {
  const symbol = getCurrencySymbol(currency);
  const convertedPrice = roundBudgetDisplayValue(convertBudgetFromMYR(priceInMYR, currency));

  if (priceInMYR >= 10000) {
    return `${symbol} ${convertedPrice.toLocaleString()}+`;
  }

  return `${symbol} ${convertedPrice.toLocaleString()}`;
}

export function BudgetRangeSelector({ value, onChange, currency = "MYR" }: BudgetRangeSelectorProps) {
  const tickValues = [0, 2500, 5000, 7500, 10000] as const;

  return (
    <div className="space-y-4">
      {/* Display selected range */}
      <p className="text-sm text-muted-foreground text-center">
        {formatBudgetPrice(value[0], currency)} – {formatBudgetPrice(value[1], currency)}
      </p>

      {/* Dual-thumb slider */}
      <Slider
        min={0}
        max={10000}
        step={100}
        value={value}
        onValueChange={(val) => onChange([val[0], val[1]])}
        className="py-2"
      />

      {/* Tick labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {tickValues.map((tick) => (
          <span key={tick}>{formatBudgetPrice(tick, currency)}</span>
        ))}
      </div>

      <p className="text-[11px] text-center leading-relaxed text-muted-foreground">
        Budget range stays pegged to the equivalent of RM 0 - RM 10,000.
      </p>
    </div>
  );
}

export function formatBudgetRange(range: [number, number], currency: CurrencyCode = "MYR"): string {
  return `${formatBudgetPrice(range[0], currency)} – ${formatBudgetPrice(range[1], currency)}`;
}

export function isDefaultBudgetRange(range: [number, number]): boolean {
  return range[0] === 0 && range[1] === 10000;
}
