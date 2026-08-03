import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { cn } from "@/lib/utils";

interface TripSectionNavigationProps {
  activeTab: string;
  onChange: (value: string) => void;
}

export function TripSectionNavigation({
  activeTab,
  onChange,
}: TripSectionNavigationProps) {
  return (
    <div className="-mx-1 px-1 py-2 md:mx-0 md:px-0 md:py-0">
      <div className="rounded-[20px] border border-transparent bg-transparent md:rounded-none md:border-none md:bg-transparent md:shadow-none">
        <SegmentedControl
          options={[
            { label: "Overview", value: "overview" },
            { label: "Itinerary", value: "itinerary" },
            { label: "Members", value: "members" },
          ]}
          value={activeTab}
          onChange={onChange}
          className="rounded-[18px] bg-secondary/90"
        />
      </div>
    </div>
  );
}