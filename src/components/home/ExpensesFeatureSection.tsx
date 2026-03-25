import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, ChevronUp } from "lucide-react";

// Member color palette matching TripExpenses
const MEMBER_COLORS = [
  { bg: "bg-member-coral" },
  { bg: "bg-member-teal" },
  { bg: "bg-member-violet" },
  { bg: "bg-member-sky" },
];

// Mock data for previews - matching TripExpenses member contribution format
const mockContributions = [
  { name: "Ahmad Razak", initial: "AR", amount: 1200, percentage: 47, colorIndex: 0 },
  { name: "Sarah Tan", initial: "ST", amount: 770, percentage: 30, colorIndex: 1 },
  { name: "Lisa Wong", initial: "LW", amount: 380, percentage: 15, colorIndex: 2 },
  { name: "Marcus Lee", initial: "ML", amount: 180, percentage: 8, colorIndex: 3 },
];

// Mockup Card 1 - Trip Overview (Matches Hero Section layout)
const OverviewMockup = () => (
  <div className="p-2 space-y-1.5">
    {/* Your Total Expenses - Full width card */}
    <div className="border border-border/50 rounded-lg p-2">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <Wallet className="h-3 w-3 text-stat-green shrink-0" />
          <p className="text-[9px] text-muted-foreground">Your Total Expenses</p>
        </div>
        <p className="text-sm font-bold text-foreground">RM 680</p>
        <p className="text-[8px] text-muted-foreground">Your share of all trip costs</p>
      </div>
    </div>
    
    {/* Two column layout for Owed cards */}
    <div className="grid grid-cols-2 gap-1.5">
      {/* You're Owed */}
      <div className="border border-border/50 rounded-lg p-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-stat-orange shrink-0" />
            <p className="text-[9px] text-muted-foreground">You're Owed</p>
          </div>
          <p className="text-sm font-bold text-foreground">RM 85</p>
          <p className="text-[8px] text-muted-foreground">Net from others</p>
        </div>
      </div>
      
      {/* You Owe */}
      <div className="border border-border/50 rounded-lg p-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-stat-red shrink-0" />
            <p className="text-[9px] text-muted-foreground">You Owe</p>
          </div>
          <p className="text-sm font-bold text-foreground">RM 120</p>
          <p className="text-[8px] text-muted-foreground">Net to others</p>
        </div>
      </div>
    </div>
  </div>
);

// Mockup Card 2 - Upfront Contributions (Matches "Paid on Behalf of the Group" card)
const ContributionsMockup = () => (
  <div className="p-2 space-y-1.5">
    {/* Card wrapper matching TripExpenses */}
    <div className="border border-border/50 rounded-lg p-2 space-y-1.5">
      <p className="text-[9px] font-semibold text-foreground">Paid on Behalf of the Group</p>
      
      {/* Summary stats row */}
      <div className="flex justify-between text-[8px] text-muted-foreground pb-1.5 border-b border-border/30">
        <span>Total: <span className="font-semibold text-foreground">RM 2,530</span></span>
        <span>Avg: <span className="font-semibold text-foreground">RM 633</span></span>
      </div>
      
      {/* Member contributions */}
      <div className="space-y-1.5">
        {mockContributions.map((member) => {
          const color = MEMBER_COLORS[member.colorIndex];
          return (
            <div key={member.name} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-4 h-4">
                    <AvatarFallback className="text-[6px] bg-muted">{member.initial}</AvatarFallback>
                  </Avatar>
                  <span className="text-[8px] font-medium truncate max-w-[60px]">{member.name}</span>
                </div>
                <span className="text-[8px] font-semibold">RM {member.amount.toLocaleString()} <span className="text-muted-foreground font-normal">({member.percentage}%)</span></span>
              </div>
              {/* Progress bar with member color */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full rounded-full ${color.bg} transition-all`}
                  style={{ width: `${member.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// Mockup Card 3 - Settlement Breakdown
const SettlementMockup = () => (
  <div className="p-2 space-y-2">
    {/* Net Amount Header */}
    <div className="text-center space-y-0.5">
      <p className="text-lg font-bold text-foreground">RM 256.00</p>
      <p className="text-[9px] text-muted-foreground">Net amount to be settled</p>
      <p className="text-[7px] text-muted-foreground/70">This is the final amount after offsetting shared expenses.</p>
    </div>
    
    {/* View Breakdown Card */}
    <div className="border border-border/50 rounded-lg overflow-hidden">
      {/* Collapsible Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30">
        <span className="text-[9px] font-medium">View breakdown</span>
        <ChevronUp className="h-3 w-3 text-muted-foreground" />
      </div>
      
      {/* Breakdown Content */}
      <div className="p-2 space-y-1.5 bg-background">
        {/* John owes Ahmad */}
        <div className="space-y-0.5">
          <p className="text-[7px] text-muted-foreground uppercase tracking-wide">John owes Ahmad</p>
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-foreground">• Accommodation - 3 nights</span>
            <span className="text-[8px] font-semibold text-foreground">RM 300.00</span>
          </div>
        </div>
        
        {/* Less: Ahmad owes John */}
        <div className="space-y-0.5">
          <p className="text-[7px] text-muted-foreground uppercase tracking-wide">Less: Ahmad owes John</p>
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-foreground">• Sky Bridge tickets</span>
            <span className="text-[8px] font-semibold text-destructive">-RM 44.00</span>
          </div>
        </div>
        
        {/* Net Total */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
          <span className="text-[9px] font-semibold text-foreground">Net total</span>
          <span className="text-[9px] font-bold text-foreground">RM 256.00</span>
        </div>
      </div>
    </div>
  </div>
);

// Feature card wrapper
interface MockupCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const MockupCard = ({ title, description, children }: MockupCardProps) => (
  <div className="min-w-[85vw] max-w-[320px] sm:min-w-0 sm:max-w-none snap-start flex-shrink-0">
    <Card className="overflow-hidden border-border/50 flex flex-col h-full">
      {/* Phone Mockup Frame */}
      <div className="bg-muted/30 p-3 border-b border-border/30">
        <div className="bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden h-[220px] sm:h-[240px]">
          {/* App Content */}
          <div className="h-full overflow-auto">
            {children}
          </div>
        </div>
      </div>
      
      {/* Card Footer */}
      <div className="p-4 space-y-1.5 flex-1">
        <h3 className="font-semibold text-base leading-tight line-clamp-2 break-words">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">{description}</p>
      </div>
    </Card>
  </div>
);

const featureCards = [
  {
    id: "overview",
    title: "Expenses at a Glance",
    description: "See your total spend, what you owe, and what others owe you.",
    mockup: <OverviewMockup />,
  },
  {
    id: "contributions",
    title: "Upfront Payments, Tracked",
    description: "Instantly track who paid upfront and manage shared costs fairly.",
    mockup: <ContributionsMockup />,
  },
  {
    id: "settlement",
    title: "Net Settlement, Simplified",
    description: "We offset expenses automatically  no mental maths, no confusion.",
    mockup: <SettlementMockup />,
  },
];

export const ExpensesFeatureSection = () => {
  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Expenses, Made Simple
        </h2>
        <p className="text-sm text-muted-foreground">
          No mental maths. No awkward reminders. Just clarity.
        </p>
      </div>

      {/* Swipeable Cards */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {featureCards.map((card) => (
          <MockupCard key={card.id} title={card.title} description={card.description}>
            {card.mockup}
          </MockupCard>
        ))}
      </div>
    </section>
  );
};
