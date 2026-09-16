import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Receipt, RefreshCw, Trash2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CurrencyLensToggle } from "@/components/shared/CurrencyLensToggle";
import { CurrencyCode, formatCurrencySpaced } from "@/lib/currencyUtils";
import { CurrencyViewMode } from "@/hooks/useCurrencyViewPreference";

interface BreakdownExpense {
  title: string;
  amount: number;
}

interface SettlementConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromUser: { id: string; name: string; imageUrl?: string };
  toUser: { id: string; name: string; imageUrl?: string };
  netAmount: number;
  // Current viewer, used to determine whether they can upload/replace/remove the receipt
  currentUserId?: string;
  // Breakdown data
  owedToReceiver: BreakdownExpense[];
  owedToDebtor: BreakdownExpense[];
  grossOwed: number;
  grossOffset: number;
  // Receipt (optional)
  receiptUrl?: string;
  receiptSubmittedAt?: string;
  onViewReceipt?: () => void;
  onUploadReceipt?: (file: File) => void;
  onRemoveReceipt?: () => void;
  // Actions
  onConfirm: () => void;
  // Back navigation (for secondary modal flow)
  onBack?: () => void;
  // Multi-currency support
  originalCurrency?: CurrencyCode;
  homeCurrency?: CurrencyCode;
  convertedAmountHome?: number;
  conversionAvailable?: boolean;
  viewMode?: CurrencyViewMode;
  onToggleViewMode?: () => void;
}




export function SettlementConfirmModal({
  open,
  onOpenChange,
  fromUser,
  toUser,
  netAmount,
  currentUserId,
  owedToReceiver,
  owedToDebtor,
  grossOwed,
  grossOffset,
  receiptUrl,
  receiptSubmittedAt,
  onViewReceipt,
  onUploadReceipt,
  onRemoveReceipt,
  onConfirm,
  onBack,
  originalCurrency,
  homeCurrency = "MYR",
  convertedAmountHome,
  conversionAvailable = true,
  viewMode = "travel",
  onToggleViewMode,
}: SettlementConfirmModalProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [receiptExpanded, setReceiptExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only the debtor (person who owes) can upload/replace/remove their own payment proof;
  // the receiver can only view what was uploaded to them.
  const isViewerOwing = currentUserId === fromUser.id;
  const isReceiptVerification = !isViewerOwing && !!receiptUrl;
  const canConfirmSettlement = !isViewerOwing;

  // Determine which currency to display
  const needsDualDisplay = originalCurrency && originalCurrency !== homeCurrency;
  const showToggle = needsDualDisplay && conversionAvailable && !!onToggleViewMode;

  // Calculate conversion rate for individual expense amounts
  const conversionRate = (convertedAmountHome !== undefined && netAmount > 0)
    ? convertedAmountHome / netAmount
    : 1;

  // Calculate amounts based on view mode
  const primaryAmount = viewMode === "home" && convertedAmountHome !== undefined
    ? convertedAmountHome
    : netAmount;
  const primaryCurrency: CurrencyCode = viewMode === "home" 
    ? homeCurrency 
    : (originalCurrency || homeCurrency);

  const secondaryAmount = viewMode === "home" 
    ? netAmount 
    : convertedAmountHome;
  const secondaryCurrency: CurrencyCode = viewMode === "home" 
    ? (originalCurrency || homeCurrency) 
    : homeCurrency;

  // Helper to get display amount for individual expense items
  const getDisplayAmount = (amount: number): number => {
    if (viewMode === "home" && convertedAmountHome !== undefined) {
      return amount * conversionRate;
    }
    return amount;
  };

  // Calculate gross amounts in the current view currency
  const displayGrossOwed = viewMode === "home" && convertedAmountHome !== undefined 
    ? grossOwed * conversionRate 
    : grossOwed;
  const displayGrossOffset = viewMode === "home" && convertedAmountHome !== undefined 
    ? grossOffset * conversionRate 
    : grossOffset;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadReceipt) {
      onUploadReceipt(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const receiptDate = receiptSubmittedAt
    ? new Date(receiptSubmittedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date unavailable";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="flex-none p-4 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            {/* Back button (if secondary modal) or spacer */}
            {onBack ? (
              <button 
                onClick={onBack}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-8" />
            )}
            <DialogTitle className="text-xl sm:text-lg font-semibold text-center flex-1">
              <span>{isReceiptVerification ? "Payment Receipts to Verify" : "Confirm Settlement"}</span>
              {isReceiptVerification && (
                <span className="block text-2xl font-bold text-foreground mt-1">
                  {formatCurrencySpaced(primaryAmount, primaryCurrency)}
                </span>
              )}
            </DialogTitle>
            <button 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* From → To Visual */}
          <div className="flex items-start justify-center gap-5 pt-3">
            {/* From User */}
            <div className="flex w-20 flex-col items-center">
              <div className="h-11 w-11 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border">
                {fromUser.imageUrl ? (
                  <img
                    src={fromUser.imageUrl}
                    alt={fromUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {fromUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <span className="mt-1.5 text-sm font-medium text-foreground whitespace-nowrap">
                {fromUser.name.split(" ")[0]}
              </span>
            </div>

            {/* Arrow */}
            <div className="flex h-11 items-center">
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>

            {/* To User */}
            <div className="flex w-20 flex-col items-center">
              <div className="h-11 w-11 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-primary/50">
                {toUser.imageUrl ? (
                  <img
                    src={toUser.imageUrl}
                    alt={toUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {toUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <span className="mt-1.5 text-sm font-medium text-foreground whitespace-nowrap">
                {toUser.name.split(" ")[0]}
              </span>
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
        </DialogHeader>

        {/* Content */}

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {/* Section 1: Net Amount (Primary Focus) */}
          {!isReceiptVerification && (
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-foreground transition-opacity duration-150">
                {formatCurrencySpaced(primaryAmount, primaryCurrency)}
              </p>
              {needsDualDisplay && conversionAvailable && secondaryAmount !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ {formatCurrencySpaced(secondaryAmount, secondaryCurrency)} (est.)
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1.5">
                Net amount to be settled
              </p>
            </div>
          )}

          {/* Section 3: Payment Receipt (Non-Blocking) */}
          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
            <p className="text-sm font-medium text-foreground mb-2">Payment receipt</p>
            {receiptUrl ? (
              <div className="rounded-xl border border-border/60 bg-background p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onViewReceipt}
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted"
                    aria-label="View payment receipt"
                  >
                    <img src={receiptUrl} alt="Payment receipt" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Receipt className="h-5 w-5 text-white" />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">Settlement payment</p>
                        <p className="mt-1 text-sm text-muted-foreground">{receiptDate}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-base font-semibold text-foreground">
                        {formatCurrencySpaced(primaryAmount, primaryCurrency)}
                        </p>
                        <button
                          type="button"
                          aria-label={receiptExpanded ? "Collapse payment receipt" : "Expand payment receipt"}
                          aria-expanded={receiptExpanded}
                          onClick={() => setReceiptExpanded((previous) => !previous)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${receiptExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>
                    <span className="mt-3 inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
                      Pending
                    </span>
                  </div>
                </div>
                {isViewerOwing && (
                  <div className="mt-3 flex items-center gap-1 border-t border-border/50 pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm gap-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Replace
                    </Button>
                    {onRemoveReceipt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemoveReceipt}
                        className="text-sm text-destructive hover:text-destructive gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                )}
                {receiptExpanded && (
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <button
                      type="button"
                      onClick={onViewReceipt}
                      className="w-full overflow-hidden rounded-xl bg-secondary/30 p-2"
                    >
                      <img
                        src={receiptUrl}
                        alt="Payment receipt"
                        className="mx-auto max-h-64 w-auto max-w-full rounded-lg object-contain"
                      />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {isViewerOwing ? "No receipt uploaded (optional)" : "No receipt uploaded yet"}
                </p>
                {isViewerOwing && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none p-4 pt-3 border-t border-border/50 space-y-2">
          {isReceiptVerification && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">1 receipt submitted</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrencySpaced(primaryAmount, primaryCurrency)}
              </span>
            </div>
          )}
          <Button 
            onClick={handleConfirm} 
            disabled={!canConfirmSettlement}
            className="w-full h-12 rounded-xl font-medium text-[15px]"
          >
            {canConfirmSettlement
              ? <><CheckCircle2 className="mr-2 h-4 w-4" />Confirm Payment Received</>
              : receiptUrl
                ? "Awaiting confirmation"
                : "Upload receipt to continue"}
          </Button>
          {!isReceiptVerification && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-10 rounded-xl font-medium text-[15px] text-muted-foreground"
            >
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
