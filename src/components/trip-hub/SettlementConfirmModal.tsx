import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, RefreshCw, Trash2, Upload, X } from "lucide-react";
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
  // Breakdown data
  owedToReceiver: BreakdownExpense[];
  owedToDebtor: BreakdownExpense[];
  grossOwed: number;
  grossOffset: number;
  // Receipt (optional)
  receiptUrl?: string;
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
  owedToReceiver,
  owedToDebtor,
  grossOwed,
  grossOffset,
  receiptUrl,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              Confirm Settlement
            </DialogTitle>
            <button 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* From → To Visual */}
          <div className="flex items-center justify-center gap-4 pt-3">
            {/* From User */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border">
                {fromUser.imageUrl ? (
                  <img src={fromUser.imageUrl} alt={fromUser.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {fromUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-foreground max-w-[80px] truncate">
                {fromUser.name.split(' ')[0]}
              </span>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />

            {/* To User */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-primary/50">
                {toUser.imageUrl ? (
                  <img src={toUser.imageUrl} alt={toUser.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {toUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-foreground max-w-[80px] truncate">
                {toUser.name.split(' ')[0]}
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
            <p className="text-xs text-muted-foreground/80 mt-2 max-w-[280px] mx-auto">
              This is the final amount after offsetting shared expenses.
            </p>
          </div>

          {/* Section 2: Settlement Breakdown (Expandable) */}
          <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors">
              <span className="text-sm font-medium text-foreground">View breakdown</span>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  breakdownOpen && "rotate-180"
                )} 
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-3">
                {/* Owes section */}
                {owedToReceiver.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {fromUser.name.split(' ')[0]} owes {toUser.name.split(' ')[0]}
                    </p>
                    {owedToReceiver.map((expense, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-foreground">• {expense.title}</span>
                        <span className="text-foreground font-medium tabular-nums">
                          {formatCurrencySpaced(getDisplayAmount(expense.amount), primaryCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Offset section */}
                {owedToDebtor.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Less: {toUser.name.split(' ')[0]} owes {fromUser.name.split(' ')[0]}
                    </p>
                    {owedToDebtor.map((expense, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-foreground">• {expense.title}</span>
                        <span className="text-stat-red font-medium tabular-nums">
                          -{formatCurrencySpaced(getDisplayAmount(expense.amount), primaryCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Net total line */}
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Net total</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrencySpaced(primaryAmount, primaryCurrency)}
                  </span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 3: Payment Receipt (Non-Blocking) */}
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-sm font-medium text-foreground mb-2">Payment receipt</p>
            {receiptUrl ? (
              <div className="flex items-center gap-3">
                <img 
                  src={receiptUrl} 
                  alt="Payment receipt" 
                  className="h-16 w-16 rounded-lg object-cover border border-border/50"
                />
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onViewReceipt}
                    className="text-sm"
                  >
                    View
                  </Button>
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
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  No receipt uploaded (optional)
                </p>
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
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none p-4 pt-3 border-t border-border/50 space-y-2">
          <Button 
            onClick={handleConfirm} 
            className="w-full h-12 rounded-xl font-medium text-[15px]"
          >
            Confirm & Settle {formatCurrencySpaced(primaryAmount, primaryCurrency)}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-xl font-medium text-[15px] text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
