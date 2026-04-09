import { cn } from "@/lib/utils";
import { travelStyles, type TravelStyle } from "@/data/travelStyles";
import { Check } from "lucide-react";

export type { TravelStyle };
export { travelStyles };

interface TravelStyleGridProps {
  selectedStyles: string[];
  onToggle: (styleId: string) => void;
}

export function TravelStyleGrid({ selectedStyles, onToggle }: TravelStyleGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {travelStyles.map((style) => {
        const isSelected = selectedStyles.includes(style.id);
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onToggle(style.id)}
            className={cn(
              "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200",
              "hover:scale-[1.03] active:scale-[0.97]",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-muted-foreground/30"
            )}
          >
            {isSelected && (
              <span className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
            <span className="text-2xl mb-1">{style.emoji}</span>
            <span
              className={cn(
                "text-xs font-medium text-center leading-tight",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {style.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
