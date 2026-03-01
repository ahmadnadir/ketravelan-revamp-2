import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NetSettlementSlideProps {
  onNext: () => void;
}

export function NetSettlementSlide({ onNext }: NetSettlementSlideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex-[0_0_100%] min-w-0 h-full">
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        {/* Settlement Mockup */}
        <div className="w-full max-w-xs mb-8">
          <Card className="p-4 space-y-4 bg-card/80 backdrop-blur border-border/50">
            {/* Net Amount */}
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-foreground">RM 256.00</p>
              <p className="text-sm text-muted-foreground mt-1">Net amount to be settled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This is the final amount after offsetting shared expenses.
              </p>
            </div>

            {/* Collapsible Breakdown */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                <span className="text-sm font-medium">View breakdown</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {/* Owes Section */}
                <div className="text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    John owes Ahmad
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">• Accommodation - 3 nights</span>
                    <span className="font-medium text-foreground">RM 300.00</span>
                  </div>
                </div>

                {/* Less Section */}
                <div className="text-left">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">
                    Less: Ahmad owes John
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">• Sky Bridge tickets</span>
                    <span className="font-medium text-orange-600">-RM 44.00</span>
                  </div>
                </div>

                {/* Divider and Net Total */}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Net total</span>
                    <span className="text-sm font-bold text-foreground">RM 256.00</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold mb-3 animate-fade-in">
          Net Settlement, Simplified
        </h1>
        <p className="text-base text-muted-foreground mb-8 max-w-xs animate-fade-in">
          We offset expenses automatically no mental maths, no confusion.
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
