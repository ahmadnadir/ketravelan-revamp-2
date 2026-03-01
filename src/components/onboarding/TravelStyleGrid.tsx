import { cn } from "@/lib/utils";
import { travelStyles, type TravelStyle } from "@/data/travelStyles";

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
              "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200",
              "hover:scale-[1.03] active:scale-[0.97]",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-muted-foreground/30"
            )}
          >
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
