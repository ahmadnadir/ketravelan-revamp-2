import { Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ExpensesAtGlanceSlideProps {
  onNext: () => void;
}

export function ExpensesAtGlanceSlide({ onNext }: ExpensesAtGlanceSlideProps) {
  return (
    <div className="flex-[0_0_100%] min-w-0 h-full">
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        {/* Expense Summary Mockup */}
        <div className="w-full max-w-xs mb-8">
          <Card className="p-4 space-y-4 bg-card/80 backdrop-blur border-border/50">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Your Total Expenses</span>
            </div>

            {/* Total Amount */}
            <div className="text-center py-3">
              <p className="text-3xl font-bold text-foreground">RM 680</p>
              <p className="text-xs text-muted-foreground mt-1">Your share of all trip costs</p>
            </div>

            {/* Two Column Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-medium text-green-600">You're Owed</span>
                </div>
                <p className="text-lg font-bold text-foreground">RM 85</p>
                <p className="text-xs text-muted-foreground">Net from others</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-orange-600" />
                  <span className="text-xs font-medium text-orange-600">You Owe</span>
                </div>
                <p className="text-lg font-bold text-foreground">RM 120</p>
                <p className="text-xs text-muted-foreground">Net to others</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold mb-3 animate-fade-in">
          Expenses at a Glance
        </h1>
        <p className="text-base text-muted-foreground mb-8 max-w-xs animate-fade-in">
          See your total spend, what you owe, and what others owe you.
        </p>

        {/* Button */}
        <div className="w-full max-w-xs animate-fade-in">
          <Button 
            onClick={onNext}
            className="w-full h-12 text-base font-medium rounded-xl"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
