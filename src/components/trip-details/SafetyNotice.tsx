import { Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

const SafetyNotice = () => {
  const safetyTips = [
    "Confirm trip details directly with the organizer",
    "Keep your belongings secure at all times",
    "Share your itinerary with someone you trust",
    "Save emergency contacts before the trip",
  ];

  return (
    <Card className="p-3 sm:p-4 border-border/50 bg-white">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm mb-2">
            Travel Smart & Stay Safe
          </h4>
          <ul className="space-y-1">
            {safetyTips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default SafetyNotice;
