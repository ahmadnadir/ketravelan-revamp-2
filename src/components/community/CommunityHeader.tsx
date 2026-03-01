import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { useCommunity } from "@/contexts/CommunityContext";

export function CommunityHeader() {
  const { mode, setMode } = useCommunity();

  const options = [
    { label: "Stories", value: "stories" },
    { label: "Discussions", value: "discussions" },
  ];

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-2 mb-2">
      <SegmentedControl
        options={options}
        value={mode}
        onChange={(value) => setMode(value as "stories" | "discussions")}
        className="w-full sm:w-auto sm:max-w-xs sm:mx-auto"
      />
    </div>
  );
}
