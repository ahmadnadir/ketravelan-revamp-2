import { supabase } from "@/lib/supabase";

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  flag_emoji: string | null;
  flag?: string;
  decimal_places: number;
  country_codes: string[];
  search_terms: string[];
  sort_order: number;
  fallback_rate_to_myr: number | null;
  fallback_rate_updated_at: string | null;
  is_frankfurter_supported: boolean;
  is_active: boolean;
  allow_as_home: boolean;
  allow_as_travel: boolean;
};

let currenciesCache: Currency[] | null = null;
let currenciesRequest: Promise<Currency[]> | null = null;

const normalizeCurrency = (currency: Currency): Currency => ({
  ...currency,
  code: currency.code.toUpperCase(),
  flag_emoji: currency.flag_emoji || "",
  flag: currency.flag_emoji || "",
  country_codes: Array.isArray(currency.country_codes) ? currency.country_codes : [],
  search_terms: Array.isArray(currency.search_terms) ? currency.search_terms : [],
  decimal_places: Number(currency.decimal_places ?? 2),
  sort_order: Number(currency.sort_order ?? 1000),
  fallback_rate_to_myr: currency.fallback_rate_to_myr == null ? null : Number(currency.fallback_rate_to_myr),
  is_frankfurter_supported: Boolean(currency.is_frankfurter_supported),
  is_active: currency.is_active !== false,
  allow_as_home: currency.allow_as_home !== false,
  allow_as_travel: currency.allow_as_travel !== false,
});

export async function getCurrencies(options: { activeOnly?: boolean } = {}): Promise<Currency[]> {
  if (currenciesCache) {
    return options.activeOnly ? currenciesCache.filter((currency) => currency.is_active) : currenciesCache;
  }

  if (!currenciesRequest) {
    const request = (async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("code,name,symbol,flag_emoji,decimal_places,country_codes,search_terms,sort_order,fallback_rate_to_myr,fallback_rate_updated_at,is_frankfurter_supported,is_active,allow_as_home,allow_as_travel")
        .order("sort_order", { ascending: true })
        .order("code", { ascending: true });
        if (error) throw error;
        currenciesCache = (data || []).map((currency) => normalizeCurrency(currency as Currency));
        return currenciesCache;
    })();
    const timeout = new Promise<Currency[]>((_, reject) => {
      window.setTimeout(() => reject(new Error("Currency request timed out")), 10000);
    });
    currenciesRequest = Promise.race([request, timeout]).then((result) => {
        currenciesRequest = null;
        return result;
      }, (error) => {
        currenciesRequest = null;
        throw error;
      });
  }

  const currencies = await currenciesRequest;
  return options.activeOnly ? currencies.filter((currency) => currency.is_active) : currencies;
}

export async function getActiveCurrencies(): Promise<Currency[]> {
  return getCurrencies({ activeOnly: true });
}

export async function getCurrency(code: string): Promise<Currency | null> {
  const normalizedCode = code.trim().toUpperCase();
  const currencies = await getCurrencies();
  return currencies.find((currency) => currency.code === normalizedCode) || null;
}

export function getCachedCurrencies(): Currency[] {
  return currenciesCache || [];
}

export function getCachedCurrency(code: string): Currency | undefined {
  const normalizedCode = code.trim().toUpperCase();
  return getCachedCurrencies().find((currency) => currency.code === normalizedCode);
}

export function searchCurrencyList(currencies: Currency[], query: string): Currency[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return currencies;

  return currencies.filter((currency) => [
    currency.code,
    currency.name,
    currency.symbol,
    ...currency.country_codes,
    ...currency.search_terms,
  ].some((value) => value.toLowerCase().includes(normalizedQuery)));
}

export function clearCurrencyCache() {
  currenciesCache = null;
}
