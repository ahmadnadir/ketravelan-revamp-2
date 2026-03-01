/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Receipt, Search, X, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserTrips } from "@/lib/trips";
import { fetchExpensesByTrips, getWhoOwesWho } from "@/lib/expenses";

interface TripWithExpense {
  id: string;
  name: string;
  imageUrl: string | null;
  expenses: {
    id: string;
    trip_id: string;
    created_by: string;
    description: string;
    amount: number;
    currency: string;
    category: string;
    expense_date: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    receipt_url: string | null;
    notes: string | null;
  }[];
}

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tripsWithExpenses, setTripsWithExpenses] = useState<TripWithExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [whoOwesWho, setWhoOwesWho] = useState<Record<string, any[]>>({ });
  const { user } = useAuth();
  const { toast } = useToast();

  // Load user's trips and their expenses
  useEffect(() => {
    const loadTripsAndExpenses = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Fetch user's trips
        const trips: any[] = await fetchUserTrips(user.id);

        if (trips.length === 0) {
          setTripsWithExpenses([]);
          setWhoOwesWho({});
          return;
        }

        // Fetch expenses for all trips grouped by trip_id
        const expensesByTrip = await fetchExpensesByTrips(trips.map((t: any) => t.id));

        // Map trips with their expenses
        const tripsData: TripWithExpense[] = trips.map((trip: any) => ({
          id: trip.id,
          name: trip.title,
          imageUrl: trip.cover_image || null,
          expenses: expensesByTrip.get(trip.id) || [],
        }));

        setTripsWithExpenses(tripsData);
        // Fetch who owes who for each trip
        const whoOwes: Record<string, any[]> = {};
        await Promise.all(trips.map(async (trip: any) => {
          try {
            const data = await getWhoOwesWho(trip.id);
            whoOwes[trip.id] = data || [];
          } catch {}
        }));
        setWhoOwesWho(whoOwes);
      } catch (error) {
        // ...debug output removed...
        toast({
          title: "Failed to load expenses",
          description: "Please try again later",
        });
        setTripsWithExpenses([]);
        setWhoOwesWho({});
      } finally {
        setIsLoading(false);
      }
    };

    loadTripsAndExpenses();
  }, [user?.id, toast]);

  // Filter trips based on search query
  const filteredTrips = useMemo(() => {
    if (searchQuery === "") return tripsWithExpenses;
    return tripsWithExpenses.filter((trip) =>
      trip.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, tripsWithExpenses]);

  // Calculate expense summary for display
  const getExpenseSummary = () => {
    let totalExpenses = 0;
    let expenseCount = 0;

    tripsWithExpenses.forEach((trip) => {
      trip.expenses.forEach((expense) => {
        totalExpenses += expense.amount;
        expenseCount += 1;
      });
    });

    return { count: expenseCount, amount: totalExpenses };
  };

  const expenseSummary = getExpenseSummary();

  return (
    <AppLayout>
      <div className="py-6 space-y-4">
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
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Summary Card */}
        {expenseSummary.count > 0 && !isLoading && (
          <Card className="p-4 border-border/50 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total expenses</p>
                <p className="font-semibold text-foreground">
                  {expenseSummary.count} expense{expenseSummary.count !== 1 ? "s" : ""} · ${expenseSummary.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading expenses...</p>
          </div>
        )}

        {/* Trip List */}
        {!isLoading && filteredTrips.length > 0 && (
          <div className="space-y-2">
            {filteredTrips.map((trip) => (
              <div key={trip.id}>
                <Link to={`/trip/${trip.id}/hub?tab=expenses`}>
                  <Card className="p-4 border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-muted overflow-hidden">
                          {trip.imageUrl ? (
                            <img
                              src={trip.imageUrl}
                              alt={trip.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{trip.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {trip.expenses.length} expense{trip.expenses.length !== 1 ? "s" : ""}
                          {trip.expenses.length > 0 && (
                            <span> · ${trip.expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</span>
                          )}
                        </p>
                      </div>
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
                {/* Who Owes Who summary */}
                {whoOwesWho[trip.id] && whoOwesWho[trip.id].length > 0 && (
                  <Card className="p-3 mt-1 bg-muted/20">
                    <div className="text-xs text-muted-foreground font-medium mb-1">Who owes who:</div>
                    <ul className="text-xs">
                      {whoOwesWho[trip.id].map((row, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{row.debtor_name}</span> owes <span className="font-semibold">{row.creditor_name}</span>: ${Number(row.amount).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredTrips.length === 0 && (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No trips found</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-primary text-sm hover:underline"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No trips with expenses yet</p>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
