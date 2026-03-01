import { Slider } from "@/components/ui/slider";

interface BudgetRangeSelectorProps {
  value: [number, number];
  onChange: (range: [number, number]) => void;
}

export function BudgetRangeSelector({ value, onChange }: BudgetRangeSelectorProps) {
  const formatPrice = (price: number) => {
    if (price >= 10000) return "RM 10,000+";
    return `RM ${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Display selected range */}
      <p className="text-sm text-muted-foreground text-center">
        {formatPrice(value[0])} – {formatPrice(value[1])}
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
        <span>RM 0</span>
        <span>RM 2.5k</span>
        <span>RM 5k</span>
        <span>RM 7.5k</span>
        <span>RM 10k+</span>
      </div>
    </div>
  );
}

export function formatBudgetRange(range: [number, number]): string {
  const formatPrice = (price: number) => {
    if (price >= 10000) return "RM 10,000+";
    return `RM ${price.toLocaleString()}`;
  };
  return `${formatPrice(range[0])} – ${formatPrice(range[1])}`;
}

export function isDefaultBudgetRange(range: [number, number]): boolean {
  return range[0] === 0 && range[1] === 10000;
}
