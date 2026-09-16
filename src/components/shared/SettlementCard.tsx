import { Link } from "react-router-dom";
import { ArrowRight, Bell, CheckCircle2, FileText, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface SettlementCardProps {
  fromUser: { id: string; name: string; imageUrl?: string };
  toUser: { id: string; name: string; imageUrl?: string };
  amount: number;
  currency?: string;
  formatAmount?: (amount: number) => string;
  status: "pending" | "settled" | "awaiting" | "rejected" | "cancelled";
  currentUserId?: string;
  receiptAvailable?: boolean;
  showReminder?: boolean;
  onCardClick?: () => void;
  onViewDetails?: () => void;
  onViewReceipt?: () => void;
  onSendReminder?: () => void;
  onMarkPaid?: () => void;
  onUploadReceipt?: () => void;
}

export function SettlementCard({
  fromUser,
  toUser,
  amount,
  currency = "RM",
  formatAmount,
  status,
  currentUserId,
  onCardClick,
  onViewDetails,
  onViewReceipt,
  onSendReminder,
  onMarkPaid,
  onUploadReceipt,
}: SettlementCardProps) {
  const isUserPayer = currentUserId === fromUser.id;
  const primaryAction = isUserPayer
    ? status === "settled"
      ? { label: "View Receipt", icon: FileText, handler: onViewReceipt }
      : status === "awaiting"
        ? { label: "Notify to Approve", icon: Bell, handler: onSendReminder }
        : { label: "Pay Now", icon: Upload, handler: onUploadReceipt }
    : status === "settled"
      ? { label: "View Receipt", icon: FileText, handler: onViewReceipt }
      : status === "awaiting"
        ? { label: "Confirm Payment", icon: CheckCircle2, handler: onMarkPaid }
        : { label: "Remind", icon: Bell, handler: onSendReminder };

  const PrimaryIcon = primaryAction.icon;

  return (
    <Card 
      className={`p-3 border-border/50 transition-all ${onCardClick ? "cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98]" : ""}`}
      onClick={onCardClick}
    >
      {/* Top Section: From → To (Compact Context) */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* From User */}
        <Link 
          to={`/user/${fromUser.id}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {fromUser.imageUrl ? (
              <img src={fromUser.imageUrl} alt={fromUser.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[14px] sm:text-xs font-medium text-muted-foreground">
                {fromUser.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[14px] sm:text-xs font-medium text-foreground line-clamp-2 max-w-[90px] leading-tight">
            {fromUser.name}
          </span>
        </Link>

        {/* Arrow */}
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* To User */}
        <Link 
          to={`/user/${toUser.id}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[14px] sm:text-xs font-medium text-foreground line-clamp-2 max-w-[90px] leading-tight text-right">
            {toUser.name}
          </span>
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {toUser.imageUrl ? (
              <img src={toUser.imageUrl} alt={toUser.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[14px] sm:text-xs font-medium text-muted-foreground">
                {toUser.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Middle Section: Net Amount (Primary Focus) */}
      <div className="text-center py-1">
        <p className="text-2xl font-bold text-foreground">
          {currency} {formatAmount ? formatAmount(amount) : amount.toLocaleString()}
        </p>
        <p className="text-[14px] sm:text-xs text-muted-foreground mt-0.5">Net amount owed</p>
      </div>

      {/* Status Badge - Centered */}
      <div className="flex justify-center mb-2">
        <StatusBadge status={status} size="md" className="text-[13px] sm:text-xs px-3.5 sm:px-3 py-1.5 sm:py-1" />
      </div>

      {/* Actions - one consistent secondary/primary layout for every state */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-10 text-sm"
          onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}
        >
          <FileText className="h-4 w-4 mr-2" />
          View Details
        </Button>
        <Button
          size="sm"
          className="w-full h-10 text-sm bg-foreground text-background hover:bg-foreground/90"
          onClick={(e) => { e.stopPropagation(); primaryAction.handler?.(); }}
        >
          <PrimaryIcon className="h-4 w-4 mr-2" />
          {primaryAction.label}
        </Button>
      </div>
    </Card>
  );
}