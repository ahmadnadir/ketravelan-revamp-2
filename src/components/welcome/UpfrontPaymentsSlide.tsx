import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UpfrontPaymentsSlideProps {
  onNext: () => void;
}

const memberPayments = [
  { initials: "AR", name: "Ahmad Razak", amount: 1200, percent: 47, color: "bg-cyan-500" },
  { initials: "ST", name: "Sarah Tan", amount: 770, percent: 30, color: "bg-orange-400" },
  { initials: "LW", name: "Lisa Wong", amount: 380, percent: 15, color: "bg-purple-500" },
  { initials: "ML", name: "Marcus Lee", amount: 180, percent: 8, color: "bg-blue-500" },
];

export function UpfrontPaymentsSlide({ onNext }: UpfrontPaymentsSlideProps) {
  return (
    <div className="flex-[0_0_100%] min-w-0 h-full">
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        {/* Payments Mockup */}
        <div className="w-full max-w-xs mb-8">
          <Card className="p-4 space-y-4 bg-card/80 backdrop-blur border-border/50">
            {/* Header */}
            <div>
              <p className="text-sm font-medium text-left">Paid on Behalf of the Group</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Total: RM 2,530</span>
                <span className="text-xs text-muted-foreground">Avg: RM 633</span>
              </div>
            </div>

            {/* Member List */}
            <div className="space-y-3">
              {memberPayments.map((member) => (
                <div key={member.initials} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${member.color} flex items-center justify-center`}>
                        <span className="text-xs font-medium text-white">{member.initials}</span>
                      </div>
                      <span className="text-sm text-foreground">{member.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      RM {member.amount.toLocaleString()} ({member.percent}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${member.color} rounded-full transition-all duration-500`}
                      style={{ width: `${member.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold mb-3 animate-fade-in">
          Upfront Payments, Tracked
        </h1>
        <p className="text-base text-muted-foreground mb-8 max-w-xs animate-fade-in">
          Instantly track who paid upfront and manage shared costs fairly.
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
