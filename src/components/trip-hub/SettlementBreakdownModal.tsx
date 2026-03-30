import { ArrowRight, Bell, Upload, Receipt, CheckCircle2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCategoryById } from "@/lib/expenseCategories";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyLensToggle } from "@/components/shared/CurrencyLensToggle";
import { CurrencyCode, formatCurrencySpaced } from "@/lib/currencyUtils";
import { CurrencyViewMode } from "@/hooks/useCurrencyViewPreference";

export interface SettlementExpense {
  expenseId: string;
  title: string;
  date: string;
  shareAmount: number;
  status: "pending" | "settled";
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
  status: "pending" | "settled";
  contributingExpenses: SettlementExpense[];
  reverseExpenses?: SettlementExpense[];  // Expenses in reverse direction (offset)
  grossOwed?: number;                      // Total before netting
  grossOffset?: number;                    // Amount offset (subtracted)
  currentUserId: string;
  onUploadProof?: () => void;
  onMarkAllPaid?: () => void;
  onSendReminder?: () => void;
  onViewQR?: () => void;
  onViewReceipts?: () => void;
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
  contributingExpenses,
  reverseExpenses = [],
  grossOwed,
  grossOffset,
  currentUserId,
  onUploadProof,
  onMarkAllPaid,
  onSendReminder,
  onViewQR,
  onViewReceipts,
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
  
  // Determine which currency symbol to use for display
  const needsDualDisplay = originalCurrency && originalCurrency !== homeCurrency;
  const showToggle = needsDualDisplay && conversionAvailable && !!onToggleViewMode;

  // Calculate conversion rate for individual expense amounts
  const conversionRate = (convertedAmountHome !== undefined && totalAmount > 0)
    ? convertedAmountHome / totalAmount
    : 1;

  // Calculate amounts based on view mode
  const primaryAmountBase = viewMode === "home" && convertedAmountHome !== undefined
    ? convertedAmountHome
    : totalAmount;
  const primaryCurrency: CurrencyCode = viewMode === "home" 
    ? homeCurrency 
    : (originalCurrency || homeCurrency);

  const secondaryAmountBase = viewMode === "home" 
    ? totalAmount 
    : convertedAmountHome;
  const secondaryCurrency: CurrencyCode = viewMode === "home" 
    ? (originalCurrency || homeCurrency) 
    : homeCurrency;
  
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
    : undefined;
  const displayGrossOffset = grossOffset !== undefined 
    ? (viewMode === "home" && convertedAmountHome !== undefined ? grossOffset * conversionRate : grossOffset)
    : undefined;
  
  const getStatusBadge = (expenseStatus: SettlementExpense["status"]) => (
    <StatusBadge status={expenseStatus} />
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatDisplayAmount = (amount: number, currency: CurrencyCode) => {
    const normalized = hideCents ? Math.round(amount) : Number(amount.toFixed(2));
    return formatCurrencySpaced(normalized, currency);
  };

  // Use settlement's net amount for header/footer to match summary card
  const headerNetPrimary = viewMode === "home" && convertedAmountHome !== undefined
    ? convertedAmountHome
    : totalAmount;

  const headerNetSecondary = needsDualDisplay && conversionAvailable
    ? (viewMode === "home" ? totalAmount : convertedAmountHome)
    : undefined;

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
          {/* From → To Visual */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {/* From User */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border">
                {fromUser.imageUrl ? (
                  <img src={fromUser.imageUrl} alt={fromUser.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {fromUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-[15px] sm:text-sm font-medium text-foreground">{fromUser.name}</span>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* To User */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-primary/50">
                {toUser.imageUrl ? (
                  <img src={toUser.imageUrl} alt={toUser.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {toUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-[15px] sm:text-sm font-medium text-foreground">{toUser.name}</span>
            </div>
          </div>

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

          {/* Total Amount */}
          <DialogTitle className="text-center mt-3">
            <span className="text-muted-foreground text-[15px] sm:text-sm font-normal">Total Outstanding</span>
            <span className="block text-2xl font-bold text-foreground mt-0.5 transition-opacity duration-150">
              {formatDisplayAmount(Number(headerNetPrimary ?? 0), primaryCurrency)}
            </span>
            {needsDualDisplay && conversionAvailable && headerNetSecondary !== undefined && (
              <span className="block text-xs text-muted-foreground mt-0.5">
                ≈ {formatDisplayAmount(Number(headerNetSecondary as number), secondaryCurrency)} (est.)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Body - Expense Breakdown List */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide p-4 space-y-4">
          {/* Section: What fromUser owes toUser */}
          <div>
            <h3 className="text-[13px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 bg-background">
              {isViewerOwing ? "You owe" : `${fromUser.name.split(' ')[0]} owes`} {isViewerReceiving ? "You" : toUser.name.split(' ')[0]}
            </h3>

            {contributingExpenses.length > 0 ? (
              <div className="space-y-2">
                {contributingExpenses.map((expense) => {
                  const categoryData = getCategoryById(expense.category);
                  return (
                    <Card key={expense.expenseId} className="p-3 border-border/50">
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${categoryData.color.split(' ')[0]}`}>
                          <span className="text-base">{categoryData.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-[15px] sm:text-sm truncate">
                                {expense.title}
                              </p>
                              <p className="text-[13px] sm:text-xs text-muted-foreground mt-0.5">
                                {formatDate(expense.date)} · Paid by {expense.paidBy}
                              </p>
                            </div>
                            <p className="font-semibold text-foreground text-[15px] sm:text-sm shrink-0">
                              {formatDisplayAmount(getDisplayAmount(expense.shareAmount), primaryCurrency)}
                            </p>
                          </div>
                          <div className="mt-2">
                            {getStatusBadge(expense.status)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {displayGrossOwed !== undefined && (
                  <div className="flex justify-between items-center pt-2 px-1">
                    <span className="text-[15px] sm:text-sm text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground text-[15px] sm:text-sm">{formatDisplayAmount(displayGrossOwed, primaryCurrency)}</span>
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-4 text-center border-border/50">
                <p className="text-sm text-muted-foreground">No expenses</p>
              </Card>
            )}
          </div>

          {/* Section: Offset (reverse direction) */}
          {reverseExpenses.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <h3 className="text-[13px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 bg-background">
                Less: {isViewerReceiving ? "You owe" : `${toUser.name.split(' ')[0]} owes`} {isViewerOwing ? "You" : fromUser.name.split(' ')[0]}
              </h3>
              <div className="space-y-2">
                {reverseExpenses.map((expense) => {
                  const categoryData = getCategoryById(expense.category);
                  return (
                    <Card key={expense.expenseId} className="p-3 border-border/50">
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${categoryData.color.split(' ')[0]}`}>
                          <span className="text-base">{categoryData.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-[15px] sm:text-sm truncate">
                                {expense.title}
                              </p>
                              <p className="text-[13px] sm:text-xs text-muted-foreground mt-0.5">
                                {formatDate(expense.date)} · Paid by {expense.paidBy}
                              </p>
                            </div>
                            <p className="font-semibold text-stat-red text-[15px] sm:text-sm shrink-0">
                              -{formatDisplayAmount(getDisplayAmount(expense.shareAmount), primaryCurrency)}
                            </p>
                          </div>
                          <div className="mt-2">
                            {getStatusBadge(expense.status)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {displayGrossOffset !== undefined && (
                  <div className="flex justify-between items-center pt-2 px-1 border-t border-border/20 mt-2">
                    <span className="text-[15px] sm:text-sm text-muted-foreground">Offset</span>
                    <span className="font-semibold text-stat-red text-[15px] sm:text-sm">-{formatDisplayAmount(displayGrossOffset, primaryCurrency)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="flex-none p-4 pt-3 border-t border-border/50 space-y-3">
          {/* Total Confirmation */}
          <div className="flex items-center justify-between text-[15px] sm:text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-foreground text-lg">{formatDisplayAmount(Number(headerNetPrimary ?? 0), primaryCurrency)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {/* Primary Action */}
            {status === "pending" && (
              isViewerOwing ? (
                <Button 
                  className="w-full h-11 text-[15px] sm:text-sm bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => {
                    onUploadProof?.();
                    onOpenChange(false);
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Receipt
                </Button>
              ) : isViewerReceiving ? (
                <Button 
                  className="w-full h-11 text-[15px] sm:text-sm bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => {
                    onMarkAllPaid?.();
                    onOpenChange(false);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              ) : null
            )}

            {/* Secondary Actions */}
            <div className="flex gap-2">
              {isViewerReceiving && status === "pending" && (
                <Button 
                  variant="outline"
                  className="flex-1 h-10 text-[15px] sm:text-sm"
                  onClick={() => {
                    onSendReminder?.();
                    onOpenChange(false);
                  }}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Remind
                </Button>
              )}
              
              {isViewerOwing && (
                <Button 
                  variant="outline"
                  className="flex-1 h-10 text-[15px] sm:text-sm"
                  onClick={() => {
                    onViewQR?.();
                    onOpenChange(false);
                  }}
                >
                  View QR
                </Button>
              )}

              {isViewerReceiving && onViewReceipts && (
                <Button 
                  variant="outline"
                  className="flex-1 h-10 text-[15px] sm:text-sm"
                  onClick={() => {
                    onViewReceipts?.();
                  }}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  View Receipts
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
