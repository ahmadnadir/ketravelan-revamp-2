import { ChevronDown, Globe } from "lucide-react";
import { useCommunity } from "@/hooks/useCommunity";
import { countries } from "@/data/communityMockData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const DISCUSSION_EXPLICIT_LOCATION_STORAGE_KEY = "ketravelan-discussion-country-explicit";

export function LocationFilter() {
  const { filters, setLocationFilter } = useCommunity();

  const selectLocation = (location: string | "global") => {
    setLocationFilter(location);
    window.localStorage.setItem(DISCUSSION_EXPLICIT_LOCATION_STORAGE_KEY, location);
  };

  const currentLocation =
    filters.location === "global"
      ? { name: "Global", flag: "🌍" }
      : countries.find((c) => c.name === filters.location) || { name: filters.location, flag: "📍" };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full">
          <span>{currentLocation.flag}</span>
          <span className="max-w-[100px] truncate">{currentLocation.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => selectLocation("global")}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          <span>Global</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {countries.map((country) => (
            <DropdownMenuItem
              key={country.name}
              onClick={() => selectLocation(country.name)}
              className="gap-2"
            >
              <span>{country.flag}</span>
              <span>{country.name}</span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
