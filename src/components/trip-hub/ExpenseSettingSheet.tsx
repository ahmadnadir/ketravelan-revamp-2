/* eslint-disable @typescript-eslint/no-explicit-any */
import { Coins, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PillChip } from "@/components/shared/PillChip";
import { CurrencyCode, currencies, travelCurrencies } from "@/lib/currencyUtils";
import { useAuth } from "@/contexts/AuthContext";

interface ExpenseSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripTravelCurrencies: CurrencyCode[];
  onTravelCurrenciesChange: (currencies: CurrencyCode[]) => void;
}

export function ExpenseSettingsSheet({
  open,
  onOpenChange,
  tripTravelCurrencies,
  onTravelCurrenciesChange,
}: ExpenseSettingsSheetProps) {
  const { user, setHomeCurrency } = useAuth();
  // Fix: Safely access homeCurrency if present, otherwise fallback to 'MYR'
  const homeCurrency = (user && 'homeCurrency' in user ? (user as any).homeCurrency : undefined) || "MYR";

  const toggleTravelCurrency = (code: CurrencyCode) => {
    if (tripTravelCurrencies.includes(code)) {
      onTravelCurrenciesChange(tripTravelCurrencies.filter((c) => c !== code));
    } else {
      onTravelCurrenciesChange([...tripTravelCurrencies, code]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Currency Settings
          </SheetTitle>
          <SheetDescription>
            Manage your home and travel currencies
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Home Currency */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Coins className="h-4 w-4 text-primary" />
              Home Currency
            </Label>
            <Select 
              value={homeCurrency} 
              onValueChange={(val) => setHomeCurrency(val as CurrencyCode)}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} – {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used to display totals and settlements
            </p>
          </div>

          {/* Travel Currencies for This Trip */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Coins className="h-4 w-4 text-muted-foreground" />
              Travel Currencies
            </Label>
            <p className="text-xs text-muted-foreground">
              Currencies available when adding expenses for this trip
            </p>
            <div className="flex flex-wrap gap-2">
              {travelCurrencies.map((currency) => (
                <PillChip
                  key={currency.code}
                  label={`${currency.symbol} ${currency.code}`}
                  selected={tripTravelCurrencies.includes(currency.code)}
                  showCheckmark
                  onClick={() => toggleTravelCurrency(currency.code)}
                />
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
