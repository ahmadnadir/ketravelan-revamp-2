import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Home, Info, Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActiveCurrencies, searchCurrencyList, type Currency } from "@/lib/currencyService";
import type { CurrencyCode } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";

interface ExpenseSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeCurrency: CurrencyCode;
  tripTravelCurrencies: CurrencyCode[];
  usedCurrencyCodes?: string[];
  onSaveCurrencies: (homeCurrency: CurrencyCode, travelCurrencies: CurrencyCode[]) => Promise<void>;
}

const currencyLabel = (currency: Currency) => (
  <span className="flex min-w-0 items-center gap-2">
    <span className="text-lg leading-none" aria-hidden="true">{currency.flag_emoji}</span>
    <span className="truncate"><span className="font-medium">{currency.symbol} {currency.code}</span><span className="text-muted-foreground"> - {currency.name}</span></span>
  </span>
);

const currencyTriggerLabel = (currency: Currency) => (
  <span className="flex min-w-0 items-center gap-2 overflow-hidden">
    <span className="shrink-0 text-lg leading-none" aria-hidden="true">{currency.flag_emoji}</span>
    <span className="shrink-0 font-medium">{currency.symbol} {currency.code}</span>
    <span className="min-w-0 whitespace-nowrap text-muted-foreground">- {currency.name}</span>
  </span>
);

export function ExpenseSettingsSheet({ open, onOpenChange, homeCurrency, tripTravelCurrencies, usedCurrencyCodes = [], onSaveCurrencies }: ExpenseSettingsSheetProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currencyLoadError, setCurrencyLoadError] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const [draftHomeCurrency, setDraftHomeCurrency] = useState(homeCurrency);
  const [draftTravelCurrencies, setDraftTravelCurrencies] = useState<string[]>(tripTravelCurrencies);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftHomeCurrency(homeCurrency);
    setDraftTravelCurrencies(tripTravelCurrencies);
    setPickerOpen(false);
    setSearch("");
    setCurrencyLoadError(false);
    setLoadAttempted(false);
  }, [open, homeCurrency, tripTravelCurrencies]);

  useEffect(() => {
    if (!open || loadAttempted) return;
    let cancelled = false;
    setLoadAttempted(true);
    setIsLoadingCurrencies(true);
    getActiveCurrencies().then((data) => {
      if (!cancelled) {
        setCurrencies(data.filter((currency) => currency.allow_as_home || currency.allow_as_travel));
        setCurrencyLoadError(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setCurrencies([]);
        setCurrencyLoadError(true);
      }
    }).finally(() => {
      if (!cancelled) setIsLoadingCurrencies(false);
    });
    return () => { cancelled = true; };
  }, [open, loadAttempted]);

  const usedCodes = useMemo(() => new Set(usedCurrencyCodes.map((code) => code.toUpperCase())), [usedCurrencyCodes]);
  const homeCurrencyData = currencies.find((currency) => currency.code === draftHomeCurrency);
  const selectedTravelCurrencies = currencies.filter((currency) => draftTravelCurrencies.includes(currency.code));
  const availableCurrencies = useMemo(() => currencies.filter((currency) => currency.code !== draftHomeCurrency && currency.allow_as_travel), [currencies, draftHomeCurrency]);
  const filteredCurrencies = useMemo(() => searchCurrencyList(availableCurrencies, search), [availableCurrencies, search]);

  const toggleTravelCurrency = (code: string) => {
    if (draftTravelCurrencies.includes(code)) {
      if (usedCodes.has(code)) return;
      setDraftTravelCurrencies((previous) => previous.filter((value) => value !== code));
    } else {
      setDraftTravelCurrencies((previous) => [...previous, code]);
    }
  };

  const handleSave = async () => {
    if (isSaving || !draftHomeCurrency) return;
    setIsSaving(true);
    try {
      await onSaveCurrencies(draftHomeCurrency, draftTravelCurrencies);
    } catch {
      // Parent owns the existing error toast; preserve drafts in the open sheet.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[min(92vh,760px)] flex-col overflow-hidden rounded-t-[28px] border-border/70 p-0 sm:mx-auto sm:max-w-2xl">
        {pickerOpen ? (
          <>
            <SheetHeader className="shrink-0 border-b border-border/60 px-5 pb-4 pt-4 sm:px-7">
              <div className="flex items-center gap-3 pr-8">
                <button type="button" onClick={() => { setPickerOpen(false); setSearch(""); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary" aria-label="Back to trip currencies"><ArrowLeft className="h-5 w-5" /></button>
                <div className="flex min-w-0 flex-col items-start text-left">
                  <SheetTitle className="text-lg">Add travel currencies</SheetTitle>
                  <SheetDescription className="mt-0.5 text-left">{draftTravelCurrencies.length} selected</SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="shrink-0 bg-background px-5 pb-4 pt-4 sm:px-7">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} onTouchStart={() => searchInputRef.current?.focus()} onPointerDown={() => searchInputRef.current?.focus()} placeholder="Search currency, country or city" className="h-11 rounded-xl pl-9" /></div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
              {isLoadingCurrencies ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading currencies...</div> : currencyLoadError ? <div className="space-y-3 py-12 text-center text-sm text-muted-foreground"><p>Unable to load currencies.</p><Button type="button" variant="outline" className="rounded-full" onClick={() => { setLoadAttempted(false); setCurrencyLoadError(false); }}>Try again</Button></div> : filteredCurrencies.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No currencies match your search.</p> : <div className="space-y-2">{filteredCurrencies.map((currency) => {
                const selected = draftTravelCurrencies.includes(currency.code);
                const inUse = usedCodes.has(currency.code);
                return <button key={currency.code} type="button" onClick={() => toggleTravelCurrency(currency.code)} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors", selected ? "border-primary/50 bg-primary/5" : "border-border/60 hover:bg-secondary/60")}>
                  <span className="min-w-0 flex-1">{currencyLabel(currency)}</span>{inUse && <span className="shrink-0 text-xs font-medium text-muted-foreground">In use</span>}<span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", selected && "border-primary bg-primary text-primary-foreground")}>{selected && <Check className="h-4 w-4" />}</span>
                </button>;
              })}</div>}
            </div>
            <div className="shrink-0 border-t border-border/60 bg-background px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-7">
              <Button
                type="button"
                onClick={() => { setPickerOpen(false); setSearch(""); }}
                className="h-11 w-full rounded-xl"
              >
                Add currency
              </Button>
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="shrink-0 border-b border-border/60 px-5 pb-4 pt-4 sm:px-7">
              <div className="flex items-center gap-3 pr-8"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground" aria-hidden="true">                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground"
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
                      />
                      <path
                        d="M13 18H5m0 0 2.4-2.4M5 18l2.4 2.4"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><SheetTitle className="text-lg sm:text-xl">Trip currencies</SheetTitle><Popover><PopoverTrigger asChild><button type="button" className="rounded-full p-1 text-muted-foreground hover:bg-secondary" aria-label="How currencies work"><Info className="h-4 w-4" /></button></PopoverTrigger><PopoverContent align="start" className="w-[min(320px,calc(100vw-2rem))] rounded-xl text-sm"><p className="font-semibold">How currencies work</p><p className="mt-2 text-muted-foreground">Travel currencies are the currencies you spend in on this trip. Pick them when adding an expense.</p><p className="mt-2 text-muted-foreground">Your home currency is used for trip totals and settlements.</p><p className="mt-2 text-muted-foreground">Ketravelan converts everything automatically, so everyone settles up in one currency.</p></PopoverContent></Popover></div></div></div>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 sm:px-7">
              <section className="space-y-3"><div className="flex items-center gap-2"><Home className="h-4 w-4 text-muted-foreground" /><div><Label className="text-sm font-semibold">Home currency</Label></div></div><Select value={draftHomeCurrency} onValueChange={setDraftHomeCurrency} disabled={isLoadingCurrencies}><SelectTrigger className="h-12 rounded-xl [&>span]:line-clamp-none"><SelectValue className="min-w-0 flex-1" placeholder="Choose home currency">{homeCurrencyData ? currencyTriggerLabel(homeCurrencyData) : draftHomeCurrency}</SelectValue></SelectTrigger><SelectContent className="max-h-[min(50vh,360px)] rounded-xl">{currencies.filter((currency) => currency.allow_as_home).map((currency) => <SelectItem key={currency.code} value={currency.code} className="rounded-lg py-2.5">{currencyLabel(currency)}</SelectItem>)}</SelectContent></Select></section>
              <section className="mt-6 space-y-3 border-t border-border/60 pt-5">
                <div>
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground"
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
                      />
                      <path
                        d="M13 18H5m0 0 2.4-2.4M5 18l2.4 2.4"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Travel currencies
                  </Label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedTravelCurrencies.map((currency) => {
                    const inUse = usedCodes.has(currency.code);
                    return (
                      <span
                        key={currency.code}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 text-sm"
                      >
                        <span aria-hidden="true">{currency.flag_emoji}</span>
                        <span>
                          {currency.symbol} {currency.code}
                        </span>
                        <button
                          type="button"
                          disabled={inUse}
                          onClick={() => toggleTravelCurrency(currency.code)}
                          className={cn(
                            "ml-0.5 rounded-full p-0.5 hover:bg-primary/10",
                            inUse && "cursor-not-allowed opacity-40"
                          )}
                          aria-label={
                            inUse
                              ? `${currency.code} is in use`
                              : `Remove ${currency.code}`
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-9 rounded-full"
                    onClick={() => setPickerOpen(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add currency
                  </Button>
                </div>

                {selectedTravelCurrencies.some((currency) =>
                  usedCodes.has(currency.code)
                ) && (
                  <p className="text-xs text-muted-foreground">
                    Currencies used by existing expenses cannot be removed.
                  </p>
                )}
              </section>
            </div>
            <div className="shrink-0 border-t border-border/60 bg-background px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-7"><Button type="button" onClick={handleSave} disabled={isSaving || isLoadingCurrencies} className="h-11 w-full rounded-xl">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSaving ? "Saving..." : "Save currencies"}</Button></div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
