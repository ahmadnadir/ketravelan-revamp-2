import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { tripCategories, type TripCategoryId } from "@/data/categories";

interface TravelStylePillsProps {
  selected: TripCategoryId[];
  onChange: (selected: TripCategoryId[]) => void;
}

export function TravelStylePills({ selected, onChange }: TravelStylePillsProps) {
  const toggleCategory = (categoryId: TripCategoryId) => {
    if (selected.includes(categoryId)) {
      onChange(selected.filter((c) => c !== categoryId));
    } else {
      onChange([...selected, categoryId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tripCategories.map((category) => {
        const isSelected = selected.includes(category.id);
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => toggleCategory(category.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm transition-all",
            isSelected
              ? "bg-foreground text-background border border-foreground"
              : "bg-secondary text-foreground hover:bg-secondary/80 border border-transparent"
            )}
          >
            {isSelected && <Check className="h-3.5 w-3.5" />}
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
