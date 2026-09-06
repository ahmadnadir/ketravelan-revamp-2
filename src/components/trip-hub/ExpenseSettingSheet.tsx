/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Check, House, Loader2 } from "lucide-react";
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
import { CurrencyCode, currencies, travelCurrencies } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";

interface ExpenseSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeCurrency: CurrencyCode;
  tripTravelCurrencies: CurrencyCode[];
  onSaveCurrencies: (homeCurrency: CurrencyCode, travelCurrencies: CurrencyCode[]) => Promise<void>;
}

export function ExpenseSettingsSheet({
  open,
  onOpenChange,
  homeCurrency,
  tripTravelCurrencies,
  onSaveCurrencies,
}: ExpenseSettingsSheetProps) {
  const [draftHomeCurrency, setDraftHomeCurrency] = useState(homeCurrency);
  const [draftTravelCurrencies, setDraftTravelCurrencies] = useState(tripTravelCurrencies);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftHomeCurrency(homeCurrency);
    setDraftTravelCurrencies(tripTravelCurrencies);
  }, [open, homeCurrency, tripTravelCurrencies]);

  const toggleTravelCurrency = (code: CurrencyCode) => {
    if (draftTravelCurrencies.includes(code)) {
      setDraftTravelCurrencies(draftTravelCurrencies.filter((c) => c !== code));
    } else {
      setDraftTravelCurrencies([...draftTravelCurrencies, code]);
    }
  };

  const selectedTravelCurrencies = travelCurrencies.filter((currency) =>
    draftTravelCurrencies.includes(currency.code)
  );

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSaveCurrencies(draftHomeCurrency, draftTravelCurrencies);
    } catch {
      // Parent owns the existing error toast; keep this sheet and its drafts open.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[90vh] flex-col overflow-hidden rounded-t-[28px] border-border/70 p-0 sm:mx-auto sm:max-w-5xl"
      >
        <SheetHeader className="shrink-0 border-b border-border/60 px-5 pb-2 pt-4 sm:px-7 sm:pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center text-foreground">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="6.5" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.7" />
                    <path
                      d="M6.5 4.9v4.2M5.2 6h1.7c.8 0 1.3.4 1.3 1s-.5 1-1.3 1H5.1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11 6h8m0 0-2.4-2.4M19 6l-2.4 2.4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="17.5" cy="17" r="3.5" stroke="currentColor" strokeWidth="1.7" />
                    <path
                      d="M16 15.4l1.5 1.6 1.5-1.6M17.5 17v2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13 18H5m0 0 2.4-2.4M5 18l2.4 2.4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Trip Currencies
              </SheetTitle>
              <SheetDescription className="mt-1.5 max-w-xl text-left text-sm leading-5 text-muted-foreground">
                Spend in travel currencies.{" "}
                Settle in your home currency. Ketravelan automatically converts your expenses for trip totals and settlements.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-1 sm:px-7 sm:pb-4">
          {/* Home Currency */}
          <div className="space-y-2.5 pb-0 pt-2 sm:pt-4">
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center text-foreground">
                <House className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <Label className="text-sm font-semibold text-foreground">Home Currency</Label>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                  The currency used to show your trip totals and settle with friends.
                </p>
              </div>
            </div>
            <Select
              value={draftHomeCurrency}
              onValueChange={(val) => setDraftHomeCurrency(val as CurrencyCode)}
            >
              <SelectTrigger className="h-11 rounded-xl border-border bg-background text-sm font-medium shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="rounded-lg">
                    {c.symbol} {c.code} – {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-1 h-px w-full bg-border" aria-hidden="true" />

          {/* Travel Currencies for This Trip */}
          <div className="space-y-3.5 pb-2 pt-0 sm:pb-4">
            <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center text-foreground">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="6.5"
                  cy="7"
                  r="3.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M6.5 4.9v4.2M5.2 6h1.7c.8 0 1.3.4 1.3 1s-.5 1-1.3 1H5.1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M11 6h8m0 0-2.4-2.4M19 6l-2.4 2.4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="17.5"
                  cy="17"
                  r="3.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M16 15.4l1.5 1.6 1.5-1.6M17.5 17v2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 18H5m0 0 2.4-2.4M5 18l2.4 2.4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
              <div className="min-w-0">
                <Label className="text-sm font-semibold text-foreground">Travel Currencies</Label>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                  Select the currencies you'll use when adding expenses for this trip.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {travelCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  aria-pressed={tripTravelCurrencies.includes(currency.code)}
                  onClick={() => toggleTravelCurrency(currency.code)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    draftTravelCurrencies.includes(currency.code)
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  {draftTravelCurrencies.includes(currency.code) && (
                    <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                  )}
                  <span>{currency.symbol}</span>
                  <span>{currency.code}</span>
                </button>
              ))}
            </div>

            <div className="text-xs text-muted-foreground" aria-live="polite">
              <span>
                {selectedTravelCurrencies.length === 0
                  ? "No travel currencies selected"
                  : `${selectedTravelCurrencies.length} travel ${selectedTravelCurrencies.length === 1 ? "currency" : "currencies"} selected`}
                {selectedTravelCurrencies.length > 0 && (
                  <span className="font-medium text-foreground">
                    {" · "}{selectedTravelCurrencies.map((currency) => currency.code).join(", ")}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 bg-background px-5 py-2 sm:px-7 sm:py-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save currencies"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
