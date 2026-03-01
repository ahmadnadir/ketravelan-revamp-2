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

  const useHomeView =
    canToggleCurrency && cardViewCurrency === "home" && typeof homeAmount === "number" && !!homeCurrency;
  const displayAmount = useHomeView
    ? (homeAmount as number)
    : (typeof originalAmount === "number" ? (originalAmount as number) : amount);
  const displayCurrency = useHomeView
    ? (homeCurrency as string)
    : (originalCurrency ?? currency);
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
        icon: <Upload className="h-4 w-4 mr-2" /> 
      };
    }
    return { 
      label: "View Details", 
      icon: <FileText className="h-4 w-4 mr-2" /> 
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
        "group p-3 sm:p-4 border-border/50 cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98] transition-all",
        isHighlighted && "ring-2 ring-stat-green/50 animate-settle-pulse"
      )}
      onClick={handleCardClick}
    >
      <div className="space-y-2">
          {/* Header: Title and Amount */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-[15px] sm:text-sm md:text-base text-foreground truncate">{title}</h4>
              <p className="text-[13px] leading-relaxed sm:text-xs sm:leading-normal text-muted-foreground">
                Paid by {paidBy} · {formatDisplayDate(date)}
              </p>
            </div>
            <div className="flex items-start gap-1 shrink-0">
              <span className="text-base sm:text-lg font-semibold text-foreground">
                {displayCurrency} {displayAmount.toLocaleString()}
              </span>
              {canToggleCurrency && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 -mt-1"
                  onClick={(e) => { e.stopPropagation(); setCardViewCurrency(cardViewCurrency === "home" ? "original" : "home"); }}
                  title={`Switch to ${cardViewCurrency === "home" ? "original" : "home"} currency`}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              )}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 -mt-1"
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
          </div>

          {/* Group Settlement Progress - Informational, not alarming */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[13px] leading-relaxed sm:text-xs sm:leading-normal font-medium",
                isFullySettled ? "text-stat-green" : "text-muted-foreground"
              )}>
                Group settlement: {paymentProgress}%
              </span>
            </div>
                <Progress 
                  value={paymentProgress} 
                  className="h-1.5"
                  autoVariant
                  animate
                  animationDelay={animationDelay}
                />
          </div>

          {/* Personal Impact Row - Primary Focus */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[14px] sm:text-xs font-medium text-foreground">Your share:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] sm:text-xs font-semibold">{formatCurrency(personalShare.amount, displayCurrency)}</span>
              <StatusBadge 
                status={personalShare.status} 
                className="text-[12px] sm:text-[10px] px-2.5 sm:px-2 py-1 sm:py-0.5"
              />
            </div>
          </div>

          {/* Primary Action Button - Always visible */}
          <div className="pt-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPrimaryAction();
              }}
              className={cn(
                "w-full h-9 text-[14px] sm:text-xs font-medium transition-all duration-150",
                personalShare.status === "pending" 
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {buttonConfig.icon}
              {buttonConfig.label}
            </Button>
          </div>
        </div>
    </Card>
  );
}
