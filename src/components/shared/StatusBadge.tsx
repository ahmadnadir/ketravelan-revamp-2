import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type StatusType = "settled" | "pending" | "awaiting" | "rejected" | "cancelled";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: "sm" | "md";
}

const statusStyles: Record<StatusType, string> = {
  settled: "bg-stat-green/10 text-stat-green border-stat-green/30",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  awaiting: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<StatusType, string> = {
  settled: "Settled",
  pending: "Pending",
  awaiting: "Awaiting Confirmation",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const sizeStyles = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export function StatusBadge({ status, className, size = "sm" }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        statusStyles[status],
        sizeStyles[size],
        className
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}
