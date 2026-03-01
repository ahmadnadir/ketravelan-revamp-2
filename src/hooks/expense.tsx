import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Receipt, Search, X, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mockChats } from "@/data/mockData";
import { useExpenses } from "@/contexts/ExpenseContext";

export default function Expenses() {
  const { expenses } = useExpenses();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter only trip chats (not direct messages)
  const tripChats = useMemo(() => {
    return mockChats.filter((chat) => chat.type === "trip");
  }, []);

  const filteredTrips = useMemo(() => {
    if (searchQuery === "") return tripChats;
    return tripChats.filter((chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, tripChats]);

  // Calculate expense summary from shared context
  const expenseSummary = useMemo(() => {
    const pendingExpenses = expenses.filter(exp => exp.paymentProgress < 100);
    const totalPending = pendingExpenses.reduce((sum, exp) => {
      const pendingAmount = exp.amount * (1 - exp.paymentProgress / 100);
      return sum + pendingAmount;
    }, 0);
    return { count: pendingExpenses.length, amount: totalPending };
  }, [expenses]);


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
        {expenseSummary.count > 0 && (
          <Card className="p-4 border-border/50 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending settlements</p>
                <p className="font-semibold text-foreground">
                  {expenseSummary.count} expense{expenseSummary.count !== 1 ? 's' : ''} · RM {expenseSummary.amount.toFixed(0)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Trip List */}
        <div className="space-y-2">
          {filteredTrips.map((chat) => (
            <Link
              key={chat.id}
              to={`/trip/${chat.id.replace("trip-", "")}/hub?tab=expenses`}
            >
              <Card className="p-4 border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-muted overflow-hidden">
                      {chat.imageUrl ? (
                        <img
                          src={chat.imageUrl}
                          alt={chat.name}
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
                    <h4 className="font-medium text-foreground truncate">
                      {chat.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Tap to view expenses
                    </p>
                  </div>
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {filteredTrips.length === 0 && (
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
