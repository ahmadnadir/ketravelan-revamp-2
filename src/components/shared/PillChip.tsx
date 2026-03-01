import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface PillChipProps {
  label: string;
  icon?: string;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  size?: "sm" | "md";
  onClick?: () => void;
  selected?: boolean;
  showCheckmark?: boolean;
  removable?: boolean;
  className?: string;
}

const variantStyles = {
  default: "bg-secondary text-secondary-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

export function PillChip({
  label,
  icon,
  variant = "default",
  size = "md",
  onClick,
  selected,
  showCheckmark = false,
  removable = false,
  className,
}: PillChipProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-all border",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        onClick && "cursor-pointer active:scale-95",
        selected 
          ? "bg-foreground text-background border-foreground" 
          : "bg-white border-border text-muted-foreground hover:bg-foreground hover:text-background",
        className
      )}
    >
      {selected && showCheckmark && (
        <Check className="h-3 w-3" />
      )}
      {icon && <span className="pointer-events-none">{icon}</span>}
      <span className="pointer-events-none">{label}</span>
      {removable && (
        <X className="h-3 w-3 ml-0.5" />
      )}
    </span>
  );
}
