import { Card } from "@/components/ui/card";
const cards = [
  {
    emoji: "🚀",
    title: "Create or Join a Trip",
    description: "Start your own or hop into an open one.",
  },
  {
    emoji: "💬",
    title: "Chat & Coordinate",
    description: "Keep everyone aligned in one place.",
  },
  {
    emoji: "✅",
    title: "Settle with One Tap",
    description: "When it's time to pay, everything's ready.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          Your Trip, Simplified
        </h2>
        <p className="text-sm text-muted-foreground">
          Easy to start, effortless to manage, smooth to finish.
        </p>
      </div>

      {/* Swipeable Cards */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {cards.map((card, index) => (
          <Card key={index} className="min-w-[280px] sm:min-w-0 snap-start p-4 sm:p-5 space-y-3 border-border/50 flex-shrink-0">
            <div className="text-2xl sm:text-3xl">
              {card.emoji}
            </div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              {card.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {card.description}
            </p>
          </Card>
        ))}
      </div>

    </section>
  );
}
