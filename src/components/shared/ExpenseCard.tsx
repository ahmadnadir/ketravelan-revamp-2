import { MoreVertical, Upload, FileText, ArrowLeftRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCategoryFromTitle } from "@/lib/expenseCategories";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/dateUtils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import React from "react";

// User role types for expense actions
type ExpenseRole = "payer" | "owes" | "settled";
type PaymentStatus = "pending" | "settled";

interface Payment {
  memberId: string;
  status: PaymentStatus;
}

interface ExpenseCardProps {
  id: string;
  title: string;
  amount: number;
  currency?: string;
  paidBy: string;
  date: string;
  category?: string;
  paymentProgress?: number;
  currentUser?: string;
  currentUserId?: string;
  splitWith?: string[];
  splitType?: "equal" | "custom";
  customSplitAmounts?: { memberId: string; amount: number }[];
  payments?: Payment[];
  // Optional per-card currency view data
  originalAmount?: number;
  originalCurrency?: string;
  homeAmount?: number;
  homeCurrency?: string;
  originalCustomSplitAmounts?: { memberId: string; amount: number }[];
  homeCustomSplitAmounts?: { memberId: string; amount: number }[];
  initialViewCurrency?: "original" | "home";
  // Interaction callbacks
  onCardClick: () => void;
  onPrimaryAction: () => void;
  // Management callbacks
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
  // Visual feedback for bulk settlement
  isHighlighted?: boolean;
  // Staggered animation delay for progress bar (in ms)
  animationDelay?: number;
}

// Format currency helper
const formatCurrency = (value: number, curr: string = "RM"): string => {
  return `${curr}${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatAmount = (value: number): string => {
  return value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getCurrencySymbol = (currencyCode?: string): string => {
  const code = (currencyCode || "").toUpperCase();
  const symbolMap: Record<string, string> = {
    USD: "$",
    MYR: "RM",
    SGD: "S$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    THB: "฿",
    IDR: "Rp",
    AUD: "A$",
  };
  return symbolMap[code] || code || "$";
};

export function ExpenseCard({
  title,
  amount,
  currency = "RM",
  paidBy,
  date,
  category,
  paymentProgress = 0,
  currentUser = "Ahmad",
  currentUserId = "1",
  splitWith,
  splitType = "equal",
  customSplitAmounts,
  payments,
  originalAmount,
  originalCurrency,
  homeAmount,
  homeCurrency,
  originalCustomSplitAmounts,
  homeCustomSplitAmounts,
  initialViewCurrency = "home",
  onCardClick,
  onPrimaryAction,
  onEdit,
  onDelete,
  canManage = true,
  isHighlighted = false,
  animationDelay = 300,
}: ExpenseCardProps) {
  const normalizeCurrencyCode = (value?: string) => {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    return normalized === "RM" ? "MYR" : normalized;
  };

  const normalizedOriginalCurrency = normalizeCurrencyCode(originalCurrency ?? currency);
  const normalizedHomeCurrency = normalizeCurrencyCode(homeCurrency ?? currency);
  const canToggleCurrency =
    !!normalizedOriginalCurrency &&
    !!normalizedHomeCurrency &&
    normalizedOriginalCurrency !== normalizedHomeCurrency &&
    typeof homeAmount === "number";

  const [cardViewCurrency, setCardViewCurrency] = React.useState<"original" | "home">(initialViewCurrency);

  React.useEffect(() => {
    setCardViewCurrency(initialViewCurrency);
  }, [initialViewCurrency]);

  const useHomeView =
    canToggleCurrency && cardViewCurrency === "home" && typeof homeAmount === "number" && !!homeCurrency;
  const displayAmount = useHomeView
    ? (homeAmount as number)
    : (typeof originalAmount === "number" ? (originalAmount as number) : amount);
  const displayCurrency = useHomeView
    ? (homeCurrency as string)
    : (originalCurrency ?? currency);
  const secondaryCurrency = useHomeView ? normalizedOriginalCurrency : normalizedHomeCurrency;
  const secondaryAmount = canToggleCurrency
    ? (useHomeView
      ? (typeof originalAmount === "number" ? originalAmount : amount)
      : (homeAmount as number))
    : undefined;
  const travelCurrencySymbol = getCurrencySymbol(normalizedOriginalCurrency);
  const homeCurrencySymbol = getCurrencySymbol(normalizedHomeCurrency);
  const leftCurrencySymbol = useHomeView ? travelCurrencySymbol : homeCurrencySymbol;
  const rightCurrencySymbol = useHomeView ? homeCurrencySymbol : travelCurrencySymbol;
  const effectiveCustomSplits = useHomeView
    ? (homeCustomSplitAmounts ?? customSplitAmounts)
    : (originalCustomSplitAmounts ?? customSplitAmounts);

  // Determine user's role for this expense
  const isFullySettled = paymentProgress === 100;
  const isPayer = paidBy.toLowerCase().includes(currentUser.toLowerCase());
  
  const getExpenseRole = (): ExpenseRole => {
    if (isFullySettled) return "settled";
    if (isPayer) return "payer";
    return "owes";
  };

  const role = getExpenseRole();

  // Calculate user's personal share
  const calculatePersonalShare = (): { amount: number; status: "pending" | "settled" } => {
    const memberCount = splitWith?.length || 1;
    
    // Calculate amount
    let shareAmount: number;
    if (splitType === "custom" && effectiveCustomSplits) {
      const customAmount = effectiveCustomSplits.find(c => c.memberId === currentUserId);
      shareAmount = customAmount?.amount || (displayAmount / memberCount);
    } else {
      shareAmount = displayAmount / memberCount;
    }
    
    // If user is the payer, their share is automatically settled
    if (isPayer) {
      return { amount: shareAmount, status: "settled" };
    }
    
    // Determine status from payments array
    const userPayment = payments?.find(p => p.memberId === currentUserId);
    const status: "pending" | "settled" = userPayment?.status === "settled" ? "settled" : "pending";
    
    return { amount: shareAmount, status };
  };

  const personalShare = calculatePersonalShare();

  // CTA label and icon based on personal share status only (binary)
  const getButtonConfig = (): { label: string; icon: React.ReactNode } => {
    if (personalShare.status === "pending") {
      return { 
        label: "View & Settle", 
        icon: <Upload className="h-3.5 w-3.5 mr-1.5" /> 
      };
    }
    return { 
      label: "View Details", 
      icon: <FileText className="h-3.5 w-3.5 mr-1.5" /> 
    };
  };

  const buttonConfig = getButtonConfig();

  // Handle card click (not on button or dropdown)
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger card click if clicking on buttons or dropdown
    if (target.closest('button') || target.closest('[role="menu"]')) {
      return;
    }
    onCardClick();
  };

  return (
    <Card 
      className={cn(
        "group p-4 sm:p-5 border-border/60 rounded-3xl cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98] transition-all",
        isHighlighted && "ring-2 ring-stat-green/50 animate-settle-pulse"
      )}
      onClick={handleCardClick}
    >
      <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-[12px] sm:text-[14px] text-foreground truncate">{title}</h4>
              <p className="text-[14px] leading-none sm:text-[22px] font-semibold text-foreground mt-2">
                {displayCurrency} {formatAmount(displayAmount)}
              </p>
              <p className="text-[13px] sm:text-[15px] text-muted-foreground mt-1">
                Paid by {paidBy} · {formatDisplayDate(date)}
              </p>
            </div>
            {(canToggleCurrency || canManage) && (
              <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-muted/60 px-2 py-1">
                {canToggleCurrency && (
                  <span className="text-xs font-medium text-muted-foreground pl-1">
                    {leftCurrencySymbol}
                  </span>
                )}
                {canToggleCurrency && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full"
                    onClick={(e) => { e.stopPropagation(); setCardViewCurrency(cardViewCurrency === "home" ? "original" : "home"); }}
                    title={`Switch to ${cardViewCurrency === "home" ? "original" : "home"} currency`}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canToggleCurrency && (
                  <span className="text-base font-semibold text-foreground pr-1">
                    {rightCurrencySymbol}
                  </span>
                )}
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[16px] sm:text-[18px] font-semibold text-foreground">Your share</span>
            <div className="flex items-center gap-2">
              <span className="text-[18px] sm:text-[20px] font-semibold text-foreground">
                {displayCurrency} {formatAmount(personalShare.amount)}
              </span>
              <StatusBadge 
                status={personalShare.status} 
                className="text-[11px] px-3 py-1 rounded-full"
              />
            </div>
          </div>

          <div className="border-t border-border/70 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[13px] sm:text-[14px]",
                isFullySettled ? "text-stat-green" : "text-muted-foreground"
              )}>
                Group settlement: {paymentProgress}%
              </span>
            </div>
            <Progress 
              value={paymentProgress} 
              className="h-2"
              autoVariant
              animate
              animationDelay={animationDelay}
            />
            {canToggleCurrency && typeof secondaryAmount === "number" && secondaryCurrency && (
              <p className="text-[12px] sm:text-[13px] text-muted-foreground">
                ≈ {secondaryCurrency} {formatAmount(secondaryAmount)} (est.)
              </p>
            )}
          </div>

          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPrimaryAction();
            }}
            className={cn(
              "w-full h-10 rounded-2xl text-[14px] font-medium transition-all duration-150",
              personalShare.status === "pending" 
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {buttonConfig.icon}
            {buttonConfig.label}
          </Button>
        </div>
    </Card>
  );
}
