import { Info, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CurrencyCode, formatCurrencySpaced } from "@/lib/currencyUtils";
import { CurrencyViewMode } from "@/hooks/useCurrencyViewPreference";
import { cn } from "@/lib/utils";

interface DualCurrencyDisplayProps {
  originalAmount: number;
  originalCurrency: CurrencyCode;
  convertedAmount?: number;
  homeCurrency: CurrencyCode;
  conversionAvailable: boolean;
  viewMode: CurrencyViewMode;
  showToggle?: boolean;
  onToggle?: () => void;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right" | "center";
}

export function DualCurrencyDisplay({
  originalAmount,
  originalCurrency,
  convertedAmount,
  homeCurrency,
  conversionAvailable,
  viewMode,
  showToggle = true,
  onToggle,
  size = "md",
  align = "right",
}: DualCurrencyDisplayProps) {
  const needsDualDisplay = originalCurrency !== homeCurrency;
  
  // Determine what to show as primary/secondary based on view mode
  const primaryAmount = viewMode === "home" && convertedAmount !== undefined 
    ? convertedAmount 
    : originalAmount;
  const primaryCurrency = viewMode === "home" ? homeCurrency : originalCurrency;
  
  const secondaryAmount = viewMode === "home" 
    ? originalAmount 
    : convertedAmount;
  const secondaryCurrency = viewMode === "home" ? originalCurrency : homeCurrency;

  const sizeClasses = {
    sm: { primary: "text-sm font-semibold", secondary: "text-[11px]" },
    md: { primary: "text-base sm:text-lg font-semibold", secondary: "text-xs" },
    lg: { primary: "text-xl sm:text-2xl font-bold", secondary: "text-sm" },
  };

  const alignClasses = {
    left: "items-start text-left",
    right: "items-end text-right",
    center: "items-center text-center",
  };

  return (
    <div className={cn("flex flex-col gap-0.5", alignClasses[align])}>
      {/* Primary amount */}
      <span className={cn(sizeClasses[size].primary, "text-foreground")}>
        {formatCurrencySpaced(primaryAmount, primaryCurrency)}
      </span>
      
      {/* Secondary amount (only if dual display needed) */}
      {needsDualDisplay && (
        <div className="flex items-center gap-1.5">
          {conversionAvailable && secondaryAmount !== undefined ? (
            <span className={cn(sizeClasses[size].secondary, "text-muted-foreground")}>
              ≈ {formatCurrencySpaced(secondaryAmount, secondaryCurrency)}
            </span>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(sizeClasses[size].secondary, "text-muted-foreground flex items-center gap-1")}>
                    <Info className="h-3 w-3" />
                    Conversion unavailable
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exchange rate not available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Toggle button */}
          {showToggle && conversionAvailable && onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
