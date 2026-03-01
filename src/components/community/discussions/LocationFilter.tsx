import { ChevronDown, MapPin, Globe } from "lucide-react";
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

  const countryCodeMap: Record<string, string> = {
    "Malaysia": "MY",
    "Indonesia": "ID",
    "Thailand": "TH",
    "Vietnam": "VN",
    "Philippines": "PH",
    "Singapore": "SG",
    "Japan": "JP",
    "South Korea": "KR",
    "China": "CN",
    "India": "IN",
    "United States": "US",
    "United Kingdom": "GB",
    "France": "FR",
    "Germany": "DE",
    "Australia": "AU",
  };

  const currentLocation =
    filters.location === "global"
      ? { name: "Global", flag: "🌍", code: "" }
      : countries.find((c) => c.name === filters.location) || { name: filters.location, flag: "📍", code: "" };

  const countryCode = countryCodeMap[currentLocation.name] || "";
  const displayText = countryCode ? `${countryCode} ${currentLocation.name}` : currentLocation.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full">
          <span>{currentLocation.flag}</span>
          <span className="max-w-[100px] truncate">{displayText}</span>
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
        {countries.map((country) => {
          const code = countryCodeMap[country.name] || "";
          return (
            <DropdownMenuItem
              key={country.name}
              onClick={() => setLocationFilter(country.name)}
              className="gap-2"
            >
              <span>{country.flag}</span>
              <span>{code ? `${code} ${country.name}` : country.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
