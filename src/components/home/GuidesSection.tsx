import socialExplorerImage from "@/assets/travel-social-explorer.png";
import innerCircleImage from "@/assets/travel-inner-circle.png";

const travelModes = [
  {
    id: "public",
    badge: "The Social Explorer",
    title: "Find a Travel Buddy",
    description:
      "Make your trip Public. It becomes discoverable so new friends can join, chat, and split the cost.",
    image: socialExplorerImage,
  },
  {
    id: "private",
    badge: "The Inner Circle",
    title: "Close Friends Only",
    description:
      "Keep it Private. Not discoverable. Invite-only. Perfect for keeping your squad's itinerary and budget organized.",
    image: innerCircleImage,
  },
];

export function GuidesSection() {
  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          One App, Two Ways to Travel
        </h2>
        <p className="text-sm text-muted-foreground">
          With friends or with new people — plan, share, and settle together.
        </p>
      </div>

      {/* Swipeable Cards */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible">
        {travelModes.map((mode) => (
          <div
            key={mode.id}
            className="shrink-0 snap-start min-w-[85vw] sm:min-w-0 sm:w-full"
          >
            <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-muted">
              {/* Background Image */}
              <img
                src={mode.image}
                alt={mode.title}
                className="absolute inset-0 w-full h-full object-contain p-4"
              />

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                <span className="text-xs font-medium bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  {mode.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold mt-3">
                  {mode.title}
                </h3>
                <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
                  {mode.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
