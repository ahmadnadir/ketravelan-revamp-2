import { cn } from "@/lib/utils";
import { useCommunity } from "@/contexts/CommunityContext";

export function CommunityHeader() {
  const { mode, setMode } = useCommunity();

  return (
    <div className="bg-background border-b border-border/50 flex justify-center px-4 h-[var(--header-height)] items-center">
      <div className="flex p-0.5 bg-secondary rounded-xl">
        {(["stories", "discussions"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={cn(
              "px-5 py-1 text-sm font-medium rounded-lg transition-all capitalize",
              mode === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "stories" ? "Stories" : "Discussions"}
          </button>
        ))}
      </div>
    </div>
  );
}
