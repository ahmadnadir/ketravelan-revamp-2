import { useState, useMemo } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CurrencyCode } from "@/lib/currencyUtils";

export interface Country {
  name: string;
  flag: string;
  currency: CurrencyCode;
}

export const countries: Country[] = [
  // Southeast Asia
  { name: "Malaysia", flag: "🇲🇾", currency: "MYR" },
  { name: "Indonesia", flag: "🇮🇩", currency: "IDR" },
  { name: "Singapore", flag: "🇸🇬", currency: "USD" },
  { name: "Thailand", flag: "🇹🇭", currency: "USD" },
  { name: "Vietnam", flag: "🇻🇳", currency: "USD" },
  { name: "Philippines", flag: "🇵🇭", currency: "USD" },
  { name: "Cambodia", flag: "🇰🇭", currency: "USD" },
  { name: "Myanmar", flag: "🇲🇲", currency: "USD" },
  { name: "Laos", flag: "🇱🇦", currency: "USD" },
  { name: "Brunei", flag: "🇧🇳", currency: "USD" },
  
  // East Asia
  { name: "Japan", flag: "🇯🇵", currency: "USD" },
  { name: "South Korea", flag: "🇰🇷", currency: "USD" },
  { name: "China", flag: "🇨🇳", currency: "USD" },
  { name: "Taiwan", flag: "🇹🇼", currency: "USD" },
  { name: "Hong Kong", flag: "🇭🇰", currency: "USD" },
  
  // South Asia
  { name: "India", flag: "🇮🇳", currency: "USD" },
  { name: "Sri Lanka", flag: "🇱🇰", currency: "USD" },
  { name: "Nepal", flag: "🇳🇵", currency: "USD" },
  { name: "Bangladesh", flag: "🇧🇩", currency: "USD" },
  { name: "Pakistan", flag: "🇵🇰", currency: "USD" },
  
  // Middle East
  { name: "United Arab Emirates", flag: "🇦🇪", currency: "USD" },
  { name: "Saudi Arabia", flag: "🇸🇦", currency: "USD" },
  { name: "Qatar", flag: "🇶🇦", currency: "USD" },
  { name: "Turkey", flag: "🇹🇷", currency: "EUR" },
  
  // Europe - Eurozone
  { name: "Germany", flag: "🇩🇪", currency: "EUR" },
  { name: "France", flag: "🇫🇷", currency: "EUR" },
  { name: "Spain", flag: "🇪🇸", currency: "EUR" },
  { name: "Italy", flag: "🇮🇹", currency: "EUR" },
  { name: "Netherlands", flag: "🇳🇱", currency: "EUR" },
  { name: "Belgium", flag: "🇧🇪", currency: "EUR" },
  { name: "Austria", flag: "🇦🇹", currency: "EUR" },
  { name: "Portugal", flag: "🇵🇹", currency: "EUR" },
  { name: "Greece", flag: "🇬🇷", currency: "EUR" },
  { name: "Ireland", flag: "🇮🇪", currency: "EUR" },
  { name: "Finland", flag: "🇫🇮", currency: "EUR" },
  
  // Europe - Non-Eurozone
  { name: "United Kingdom", flag: "🇬🇧", currency: "USD" },
  { name: "Switzerland", flag: "🇨🇭", currency: "EUR" },
  { name: "Sweden", flag: "🇸🇪", currency: "EUR" },
  { name: "Norway", flag: "🇳🇴", currency: "EUR" },
  { name: "Denmark", flag: "🇩🇰", currency: "EUR" },
  { name: "Poland", flag: "🇵🇱", currency: "EUR" },
  { name: "Czech Republic", flag: "🇨🇿", currency: "EUR" },
  
  // Americas
  { name: "United States", flag: "🇺🇸", currency: "USD" },
  { name: "Canada", flag: "🇨🇦", currency: "USD" },
  { name: "Mexico", flag: "🇲🇽", currency: "USD" },
  { name: "Brazil", flag: "🇧🇷", currency: "USD" },
  { name: "Argentina", flag: "🇦🇷", currency: "USD" },
  { name: "Colombia", flag: "🇨🇴", currency: "USD" },
  { name: "Chile", flag: "🇨🇱", currency: "USD" },
  { name: "Peru", flag: "🇵🇪", currency: "USD" },
  
  // Oceania
  { name: "Australia", flag: "🇦🇺", currency: "USD" },
  { name: "New Zealand", flag: "🇳🇿", currency: "USD" },
  
  // Africa
  { name: "South Africa", flag: "🇿🇦", currency: "USD" },
  { name: "Egypt", flag: "🇪🇬", currency: "USD" },
  { name: "Morocco", flag: "🇲🇦", currency: "EUR" },
  { name: "Kenya", flag: "🇰🇪", currency: "USD" },
  { name: "Nigeria", flag: "🇳🇬", currency: "USD" },
];

interface CountrySelectorProps {
  value: string;
  onChange: (country: Country) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.name === value),
    [value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-12 justify-between text-base font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-xl">{selectedCountry.flag}</span>
              {selectedCountry.name}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Select your country
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." className="h-11" />
          <CommandList className="max-h-64">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.name}
                  value={country.name}
                  onSelect={() => {
                    onChange(country);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 py-2.5"
                >
                  <span className="text-xl">{country.flag}</span>
                  <span className="flex-1">{country.name}</span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === country.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
