/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Receipt, Search, X, Users, TrendingDown, TrendingUp, Wallet, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserTripMeta } from "@/lib/trips";
import { fetchTripsExpenseOverview } from "@/lib/expenses";
import { getLiveConversionRatesToMYR, getCurrencyInfo, CurrencyCode } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";

interface TripMeta {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface TripBalance {
  expenseCount: number;
  youOwed: number;   // already converted to home currency
  youAreOwed: number; // already converted to home currency
  totalExpenses: number; // sum of all expense amounts in home currency
}

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [trips, setTrips] = useState<TripMeta[]>([]);
  // Raw data stored without conversion — conversions happen in useMemo below
  const [rawOverview, setRawOverview] = useState<{
    expenses: any[];
    owed: any[];
    credited: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'owed' | 'credited'>('all');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const { user, homeCurrency } = useAuth();
  const { toast } = useToast();

  // Load live exchange rates once
  useEffect(() => {
    getLiveConversionRatesToMYR().then((rates) => setExchangeRates(rates)).catch(() => {});
  }, []);

  // Convert any amount from a known currency to the user's home currency
  const toHome = (amount: number, fromCurrency: string): number => {
    if (!fromCurrency || Object.keys(exchangeRates).length === 0) return amount;
    const fromRate = exchangeRates[fromCurrency as CurrencyCode] ?? 1;
    const toRate = exchangeRates[homeCurrency as CurrencyCode] ?? 1;
    return (amount * fromRate) / toRate;
  };

  // Format an amount in home currency
  const fmtHome = (amount: number): string => {
    const info = getCurrencyInfo(homeCurrency as CurrencyCode);
    const symbol = info?.symbol ?? homeCurrency;
    return `${symbol} ${amount.toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Load trips + raw expense data — NO currency conversion here
  useEffect(() => {
    const load = async () => {
      if (!user?.id) { setIsLoading(false); return; }
      try {
        setIsLoading(true);
        const rawTrips: any[] = await fetchUserTripMeta(user.id);
        if (rawTrips.length === 0) { setTrips([]); setRawOverview(null); return; }

        setTrips(rawTrips.map((t: any) => ({
          id: t.id,
          name: t.title,
          imageUrl: t.cover_image || null,
        })));

        const tripIds = rawTrips.map((t: any) => t.id);
        const overview = await fetchTripsExpenseOverview(tripIds, user.id);
        setRawOverview(overview);
      } catch {
        toast({ title: "Failed to load expenses", description: "Please try again later" });
        setTrips([]);
        setRawOverview(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.id, toast]);

  // Compute per-trip balances — re-runs whenever raw data OR exchange rates change
  const tripBalances = useMemo<Record<string, TripBalance>>(() => {
    if (!rawOverview) return {};

    const { expenses, owed, credited } = rawOverview;

    // expense_id → { tripId, currency, amount }
    const expenseMap: Record<string, { tripId: string; currency: string; amount: number }> = {};
    expenses.forEach((e: any) => {
      expenseMap[e.id] = { tripId: e.trip_id, currency: e.currency || "MYR", amount: Number(e.amount) };
    });

    const perTrip: Record<string, TripBalance> = {};
    trips.forEach(t => { perTrip[t.id] = { expenseCount: 0, totalExpenses: 0, youOwed: 0, youAreOwed: 0 }; });

    // Expense counts + total (converted per expense's own currency)
    expenses.forEach((e: any) => {
      if (!perTrip[e.trip_id]) return;
      perTrip[e.trip_id].expenseCount += 1;
      perTrip[e.trip_id].totalExpenses += toHome(Number(e.amount), e.currency || "MYR");
    });

    // You owe: unpaid participant rows for the current user
    owed.forEach((row: any) => {
      if (row.is_paid) return;
      const exp = expenseMap[row.expense_id];
      if (!exp || !perTrip[exp.tripId]) return;
      perTrip[exp.tripId].youOwed += toHome(Number(row.amount_owed), exp.currency);
    });

    // You are owed: other participants' unpaid shares on expenses the user paid for
    credited.forEach((row: any) => {
      if (row.is_paid) return;
      const exp = expenseMap[row.expense_id];
      if (!exp || !perTrip[exp.tripId]) return;
      perTrip[exp.tripId].youAreOwed += toHome(Number(row.amount_owed), exp.currency);
    });

    return perTrip;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawOverview, exchangeRates, homeCurrency, trips]);

  // Filter trips based on search query and active balance filter
  const filteredTrips = useMemo(() => {
    let result = trips;
    if (searchQuery !== "") {
      result = result.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (balanceFilter === 'owed') {
      result = result.filter((t) => (tripBalances[t.id]?.youOwed ?? 0) > 0.005);
    } else if (balanceFilter === 'credited') {
      result = result.filter((t) => (tripBalances[t.id]?.youAreOwed ?? 0) > 0.005);
    }
    return result;
  }, [searchQuery, trips, balanceFilter, tripBalances]);

  // Aggregate balance summary across all trips
  const balanceSummary = useMemo(() => {
    let youOwed = 0;
    let youAreOwed = 0;
    let totalExpenses = 0;
    Object.values(tripBalances).forEach((b) => {
      youOwed += b.youOwed;
      youAreOwed += b.youAreOwed;
      totalExpenses += b.totalExpenses;
    });
    return { youOwed, youAreOwed, totalExpenses };
  }, [tripBalances]);

  const hasActivity = Object.values(tripBalances).some(
    (b) => b.expenseCount > 0 || b.youOwed > 0 || b.youAreOwed > 0
  );

  return (
    <AppLayout>
      <div className="py-6 space-y-5">
        <h1 className="text-2xl font-bold text-foreground">Expenses</h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            disabled={isLoading}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Balance Overview */}
        {!isLoading && hasActivity && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Your Balance
            </h2>
            {/* Total Expenses pill */}
            <Card className="p-4 rounded-2xl border border-border/50 bg-card shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Overall Trip Expenses</p>
                    <p className="text-base font-bold text-foreground">
                      {fmtHome(balanceSummary.totalExpenses)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  in {homeCurrency}
                </p>
              </div>
            </Card>
            {/* You Owe + You Are Owed — single card with two clickable halves */}
            <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-border/50">
                {/* You Owe half */}
                <button
                  onClick={() => setBalanceFilter(f => f === 'owed' ? 'all' : 'owed')}
                  className={cn(
                    "p-4 text-left transition-colors w-full",
                    balanceFilter === 'owed'
                      ? "bg-destructive/10"
                      : "hover:bg-muted/40 active:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      balanceSummary.youOwed > 0 ? "text-destructive" : "text-muted-foreground"
                    )} />
                    <p className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      balanceSummary.youOwed > 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      You owe
                    </p>
                  </div>
                  <p className={cn(
                    "text-xl font-bold tracking-tight",
                    balanceSummary.youOwed > 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {fmtHome(balanceSummary.youOwed)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {balanceSummary.youOwed > 0 ? "Outstanding" : "All settled up"}
                  </p>
                  {balanceFilter === 'owed' && (
                    <p className="text-xs text-destructive font-medium mt-1.5">Tap to clear ✕</p>
                  )}
                </button>

                {/* You Are Owed half */}
                <button
                  onClick={() => setBalanceFilter(f => f === 'credited' ? 'all' : 'credited')}
                  className={cn(
                    "p-4 text-left transition-colors w-full",
                    balanceFilter === 'credited'
                      ? "bg-success/10"
                      : "hover:bg-muted/40 active:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      balanceSummary.youAreOwed > 0 ? "text-success" : "text-muted-foreground"
                    )} />
                    <p className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      balanceSummary.youAreOwed > 0 ? "text-success" : "text-muted-foreground"
                    )}>
                      You're owed
                    </p>
                  </div>
                  <p className={cn(
                    "text-xl font-bold tracking-tight",
                    balanceSummary.youAreOwed > 0 ? "text-success" : "text-foreground"
                  )}>
                    {fmtHome(balanceSummary.youAreOwed)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {balanceSummary.youAreOwed > 0 ? "Pending from others" : "Nothing pending"}
                  </p>
                  {balanceFilter === 'credited' && (
                    <p className="text-xs text-success font-medium mt-1.5">Tap to clear ✕</p>
                  )}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* Trip List */}
        {!isLoading && filteredTrips.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Trips
            </h2>
            {filteredTrips.map((trip) => {
              const bal = tripBalances[trip.id] ?? { expenseCount: 0, youOwed: 0, youAreOwed: 0, totalExpenses: 0 };

              return (
                <Link key={trip.id} to={`/trip/${trip.id}/hub?tab=expenses&from=expenses`}>
                  <Card className="p-4 rounded-2xl border border-border/50 hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-muted overflow-hidden shrink-0">
                        {trip.imageUrl ? (
                          <img src={trip.imageUrl} alt={trip.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate text-sm">{trip.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {bal.expenseCount} expense{bal.expenseCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        {balanceFilter !== 'owed' && bal.youAreOwed > 0.005 && (
                          <span className="text-xs font-semibold text-success">+{fmtHome(bal.youAreOwed)}</span>
                        )}
                        {balanceFilter !== 'credited' && bal.youOwed > 0.005 && (
                          <span className="text-xs font-semibold text-destructive">−{fmtHome(bal.youOwed)}</span>
                        )}
                        {bal.expenseCount > 0 && bal.youAreOwed <= 0.005 && bal.youOwed <= 0.005 && (
                          <span className="text-xs text-muted-foreground">Settled</span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {!isLoading && filteredTrips.length === 0 && (
          <div className="text-center py-16">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No trips found</p>
                <button onClick={() => setSearchQuery("")} className="text-primary text-sm hover:underline">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium text-foreground mb-1">No expenses yet</p>
                <p className="text-sm text-muted-foreground">Join or create a trip to start tracking expenses.</p>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
