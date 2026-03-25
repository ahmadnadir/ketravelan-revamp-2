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

export function LocationFilter() {
  const { filters, setLocationFilter } = useCommunity();

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
          onClick={() => setLocationFilter("global")}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          <span>Global</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {countries.map((country) => (
            <DropdownMenuItem
              key={country.name}
              onClick={() => setLocationFilter(country.name)}
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
