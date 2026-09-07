import { useEffect, useState } from "react";
import { ArrowLeftRight, Bell, Upload, Receipt, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, X, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CurrencyLensToggle } from "@/components/shared/CurrencyLensToggle";
import { CurrencyCode, formatCurrencySpaced } from "@/lib/currencyUtils";
import { CurrencyViewMode } from "@/hooks/useCurrencyViewPreference";

export interface SettlementExpense {
  expenseId: string;
  title: string;
  date: string;
  shareAmount: number;
  status: "pending" | "settled" | "awaiting" | "rejected" | "cancelled";
  category: string;
  paidBy: string;
  originalCurrency?: CurrencyCode;
}

interface SettlementBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromUser: { id: string; name: string; imageUrl?: string };
  toUser: { id: string; name: string; imageUrl?: string };
  totalAmount: number;
  status: "pending" | "settled" | "awaiting" | "rejected" | "cancelled";
  paymentStatus?: string;
  paymentCurrency?: string;
  paymentReceiptUrl?: string;
  contributingExpenses: SettlementExpense[];
  reverseExpenses?: SettlementExpense[];  // Expenses in reverse direction (offset)
  grossOwed?: number;                      // Total before netting
  grossOffset?: number;                    // Amount offset (subtracted)
  currentUserId: string;
  onUploadProof?: () => void;
  onMarkAllPaid?: () => void;
  onReject?: (reason: string) => void;
  onSendReminder?: () => void;
  onViewQR?: () => void;
  onViewReceipts?: () => void;
  // Navigate to the existing expense detail screen for a tapped item
  onViewExpense?: (expenseId: string) => void;
  // Multi-currency props
  originalCurrency?: CurrencyCode;
  homeCurrency?: CurrencyCode;
  convertedAmountHome?: number;
  conversionAvailable?: boolean;
  viewMode?: CurrencyViewMode;
  onToggleViewMode?: () => void;
  hideCents?: boolean;
}

export function SettlementBreakdownModal({
  open,
  onOpenChange,
  fromUser,
  toUser,
  totalAmount,
  status,
  paymentStatus,
  paymentCurrency,
  paymentReceiptUrl,
  contributingExpenses,
  reverseExpenses = [],
  grossOwed,
  grossOffset,
  currentUserId,
  onUploadProof,
  onMarkAllPaid,
  onReject,
  onSendReminder,
  onViewQR,
  onViewReceipts,
  onViewExpense,
  originalCurrency,
  homeCurrency = "MYR",
  convertedAmountHome,
  conversionAvailable = true,
  viewMode = "travel",
  onToggleViewMode,
  hideCents = false,
}: SettlementBreakdownModalProps) {
  const isViewerOwing = fromUser.id === currentUserId;
  const isViewerReceiving = toUser.id === currentUserId;

  // Both rows always start collapsed and never persist between openings
  const [expandedOwedToViewer, setExpandedOwedToViewer] = useState(false);
  const [expandedOwedByViewer, setExpandedOwedByViewer] = useState(false);
  useEffect(() => {
    if (open) {
      setExpandedOwedToViewer(false);
      setExpandedOwedByViewer(false);
    }
  }, [open]);

  // Determine which currency symbol to use for display
  const needsDualDisplay = originalCurrency && originalCurrency !== homeCurrency;
  const showToggle = needsDualDisplay && conversionAvailable && !!onToggleViewMode;

  // Calculate conversion rate for individual expense amounts
  const conversionRate = (convertedAmountHome !== undefined && totalAmount > 0)
    ? convertedAmountHome / totalAmount
    : 1;

  const primaryCurrency: CurrencyCode = viewMode === "home"
    ? homeCurrency
    : (originalCurrency || homeCurrency);

  // Helper to get display amount for individual expense items
  const getDisplayAmount = (shareAmount: number): number => {
    if (viewMode === "home" && convertedAmountHome !== undefined) {
      return shareAmount * conversionRate;
    }
    return shareAmount;
  };

  // Calculate gross amounts in the current view currency
  const displayGrossOwed = grossOwed !== undefined
    ? (viewMode === "home" && convertedAmountHome !== undefined ? grossOwed * conversionRate : grossOwed)
    : 0;
  const displayGrossOffset = grossOffset !== undefined
    ? (viewMode === "home" && convertedAmountHome !== undefined ? grossOffset * conversionRate : grossOffset)
    : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const formatDisplayAmount = (amount: number, currency: CurrencyCode) => {
    const normalized = hideCents ? Math.round(amount) : Number(amount.toFixed(2));
    return formatCurrencySpaced(normalized, currency);
  };

  // Use settlement's net amount for header/footer to match summary card
  const headerNetPrimary = viewMode === "home" && convertedAmountHome !== undefined
    ? convertedAmountHome
    : totalAmount;
  const netAmountLabel = formatDisplayAmount(Number(headerNetPrimary ?? 0), primaryCurrency);

  const firstName = (name: string) => name.split(" ")[0];

  // Determine section data based on viewer perspective
  const row1Label = isViewerOwing
    ? "You paid"
    : isViewerReceiving
    ? "You paid"
    : `${firstName(fromUser.name)} paid`;
  const row1Amount = isViewerOwing
    ? displayGrossOffset
    : isViewerReceiving
    ? displayGrossOwed
    : displayGrossOffset;
  const row1Items = isViewerOwing
    ? reverseExpenses
    : isViewerReceiving
    ? contributingExpenses
    : reverseExpenses;

  const row2Label = isViewerOwing
    ? `${firstName(toUser.name)} paid`
    : isViewerReceiving
    ? `${firstName(fromUser.name)} paid`
    : `${firstName(toUser.name)} paid`;
  const row2Amount = isViewerOwing
    ? displayGrossOwed
    : isViewerReceiving
    ? displayGrossOffset
    : displayGrossOwed;
  const row2Items = isViewerOwing
    ? contributingExpenses
    : isViewerReceiving
    ? reverseExpenses
    : contributingExpenses;

  const hasRow1 = row1Amount > 0 || row1Items.length > 0;
  const hasRow2 = row2Amount > 0 || row2Items.length > 0;

  // Sign (+) & (-) only appear when BOTH sides have non-zero expenses / items
  const hasBothSections = hasRow1 && hasRow2;

  const row1Sign = hasBothSections ? "(+)" : null;
  const row2Sign = hasBothSections ? "(–)" : null;

  const netSubtitle = isViewerReceiving
    ? `${firstName(fromUser.name)} owes you`
    : `You owe ${firstName(toUser.name)}`;

  const renderDirectionRow = (
    label: string,
    sign: string | null,
    signColorClass: string,
    amount: number,
    items: SettlementExpense[],
    expanded: boolean,
    onToggle: () => void,
  ) => (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 py-3 text-left group"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {sign && (
            <span className={cn("font-bold text-sm shrink-0", signColorClass)}>
              {sign}
            </span>
          )}
          <span className="text-[14px] sm:text-xs font-semibold text-foreground truncate">
            {label}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-0.5" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-0.5" />
          )}
        </div>
        <span className="text-sm font-semibold text-foreground shrink-0 text-right ml-auto">
          {formatDisplayAmount(amount, primaryCurrency)}
        </span>
      </button>

      {expanded && (
        <div className="pb-3 pl-5 sm:pl-6 pr-1 space-y-1 pt-0.5">
          {items.length > 0 ? (
            items.map((item) => (
              <button
                key={item.expenseId}
                type="button"
                onClick={() => onViewExpense?.(item.expenseId)}
                className="w-full flex items-center justify-between gap-2 py-1.5 px-2 text-left text-xs sm:text-sm hover:bg-muted/60 rounded-md transition-all cursor-pointer group/item active:scale-[0.99]"
              >
                <span className="text-foreground underline underline-offset-[3px] decoration-border group-hover/item:decoration-foreground font-normal truncate">
                  {item.title} · {formatDate(item.date)}
                </span>
                <span className="text-foreground font-normal shrink-0 text-right ml-auto">
                  {formatDisplayAmount(getDisplayAmount(item.shareAmount), primaryCurrency)}
                </span>
              </button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-1 px-1">No expenses</p>
          )}
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="flex-none p-4 pb-4 border-b border-border/50 relative">
          {/* Custom Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Avatars with swap icon between */}
          <DialogTitle asChild>
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {fromUser.imageUrl ? (
                    <img src={fromUser.imageUrl} alt={fromUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-medium text-sm text-muted-foreground">
                      {fromUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-medium text-foreground">{fromUser.name}</span>
              </div>

              <ArrowLeftRight className="h-4 w-4 text-muted-foreground -mt-5" />

              <div className="flex flex-col items-center gap-1.5">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {toUser.imageUrl ? (
                    <img src={toUser.imageUrl} alt={toUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-medium text-sm text-muted-foreground">
                      {toUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-medium text-foreground">{toUser.name}</span>
              </div>
            </div>
          </DialogTitle>

          {/* Currency Toggle */}
          {showToggle && originalCurrency && (
            <div className="flex justify-center mt-3">
              <CurrencyLensToggle
                travelCurrency={originalCurrency}
                homeCurrency={homeCurrency}
                viewMode={viewMode}
                onToggle={onToggleViewMode!}
              />
            </div>
          )}

          {/* Net Outstanding */}
          <div className="text-center mt-4">
            <p className="text-[12px] text-muted-foreground mb-0.5">Net outstanding</p>
            <p className="text-2xl font-semibold text-foreground">{netAmountLabel}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{netSubtitle}</p>
            {paymentStatus && (
              <p className="text-[12px] text-muted-foreground mt-2">
                Payment status: {paymentStatus.replace(/_/g, " ")}
                {paymentCurrency ? ` · ${paymentCurrency}` : ""}
                {paymentReceiptUrl ? " · Receipt available" : ""}
              </p>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide p-4">
          <Card className="border-border/50 px-4 py-0 divide-y divide-border/50">
            {hasRow1 && (
              <div>
                {renderDirectionRow(
                  row1Label,
                  row1Sign,
                  "text-emerald-700 dark:text-emerald-500",
                  row1Amount,
                  row1Items,
                  expandedOwedByViewer,
                  () => setExpandedOwedByViewer((prev) => !prev)
                )}
              </div>
            )}
            {hasRow2 && (
              <div>
                {renderDirectionRow(
                  row2Label,
                  row2Sign,
                  "text-rose-700 dark:text-rose-500",
                  row2Amount,
                  row2Items,
                  expandedOwedToViewer,
                  () => setExpandedOwedToViewer((prev) => !prev)
                )}
              </div>
            )}
            {!hasRow1 && !hasRow2 && (
              <div>
                {renderDirectionRow(
                  row1Label,
                  null,
                  "",
                  0,
                  [],
                  expandedOwedByViewer,
                  () => setExpandedOwedByViewer((prev) => !prev)
                )}
              </div>
            )}
            {hasBothSections && (
              <div className="flex justify-between items-baseline py-3">
                <span className="text-[15px] font-medium text-foreground">Net settlement</span>
                <span className="text-[15px] font-semibold text-foreground">{netAmountLabel}</span>
              </div>
            )}
          </Card>
        </div>

        {/* Sticky Footer Actions */}
        <div className="flex-none p-4 pt-3 border-t border-border/50">
          <div className="flex flex-col gap-2">
            {/* Primary Action */}
            {(status === "pending" || (status === "rejected" && isViewerOwing)) && (
              isViewerOwing ? (
                <Button
                  className="w-full h-11 text-[15px] sm:text-sm bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => {
                    onUploadProof?.();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Pay {netAmountLabel}
                </Button>
              ) : isViewerReceiving ? (
                <Button
                  className="w-full h-11 text-[15px] sm:text-sm bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => {
                    onMarkAllPaid?.();
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              ) : null
            )}

            {/* Awaiting: match the settlement card's Confirm Payment action */}
            {status === "awaiting" && isViewerReceiving && (
              <Button
                className="w-full h-11 text-[15px] sm:text-sm bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  onMarkAllPaid?.();
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Payment
              </Button>
            )}

            {status === "awaiting" && isViewerReceiving && onReject && (
              <Button
                variant="outline"
                className="w-full h-10 text-[15px] sm:text-sm text-destructive border-destructive/40"
                onClick={() => {
                  const reason = window.prompt("Reason for rejecting this receipt:");
                  if (reason?.trim()) onReject(reason.trim());
                }}
              >
                Reject receipt
              </Button>
            )}

            {/* View Receipt: settlement-level receipt remains visible after submit/settle */}
            {(status === "awaiting" || status === "settled" || status === "rejected") && paymentReceiptUrl && (
              <Button
                variant="outline"
                className="w-full h-10 text-[15px] sm:text-sm"
                onClick={() => {
                  onViewReceipts?.();
                }}
              >
                <Receipt className="h-4 w-4 mr-2" />
                View Receipt
              </Button>
            )}

            {/* Secondary Actions */}
            <div className="grid grid-cols-1 gap-2">
              {isViewerReceiving && status === "pending" && (
                <Button
                  variant="outline"
                  className="w-full h-10 text-[15px] sm:text-sm"
                  onClick={() => {
                    onSendReminder?.();
                  }}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Remind
                </Button>
              )}

              {isViewerOwing && (
                <Button
                  variant="outline"
                  className="w-full h-10 text-[15px] sm:text-sm"
                  onClick={() => {
                    onViewQR?.();
                  }}
                >
                  <QrCode className="h-3.5 w-3.5 mr-1.5" />
                  View QR
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

