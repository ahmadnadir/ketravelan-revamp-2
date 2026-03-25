import { cn } from "@/lib/utils";

interface SegmentedControlProps {
  options: { label: string; value: string; count?: number; hasUnread?: boolean }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div className={cn("flex p-1 bg-secondary rounded-xl", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all min-w-0",
            value === option.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="truncate">{option.label}</span>
          {option.count != null && option.count > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {option.count > 99 ? "99+" : option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
