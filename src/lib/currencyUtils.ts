import {
  getActiveCurrencies,
  getCurrencies,
  getCachedCurrency,
  getCachedCurrencies,
  type Currency,
} from "@/lib/currencyService";

export type CurrencyCode = string;
export type CurrencyInfo = Pick<Currency, "code" | "symbol" | "name" | "flag_emoji"> & { flag: string };

// Kept as a compatibility view for legacy consumers. Values are populated from
// the Supabase currency cache; no currency metadata is defined in the frontend.
export const conversionRatesToMYR: Record<string, number> = new Proxy({}, {
  get(_target, property: string) {
    if (property === "MYR") return 1;
    return getCachedCurrency(property)?.fallback_rate_to_myr || undefined;
  },
});

export function getCurrencyInfo(code: CurrencyCode): CurrencyInfo | undefined {
  const currency = getCachedCurrency(code);
  if (!currency) return undefined;
  return {
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
    flag_emoji: currency.flag_emoji || "",
    flag: currency.flag_emoji || "",
  };
}

export async function getCurrencyInfoAsync(code: CurrencyCode): Promise<CurrencyInfo | undefined> {
  const currency = await getCurrency(code);
  return currency ? {
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
    flag_emoji: currency.flag_emoji || "",
    flag: currency.flag_emoji || "",
  } : undefined;
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  return getCachedCurrency(currency)?.symbol || currency;
}

export interface ConversionResult {
  amount: number;
  rate: number;
  available: boolean;
}

type RatesMap = Record<string, number>;
const RATES_CACHE_KEY = "currencyRatesToMYR:cache";
const RATES_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function readCachedRates(): { rates: RatesMap; ts: number } | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.rates && parsed?.ts ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedRates(rates: RatesMap) {
  try {
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates, ts: Date.now() }));
  } catch {
    // Ignore browser storage failures.
  }
}

async function fetchFrankfurterRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/fx-rates?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`);
    if (!response.ok) return null;
    const data = await response.json();
    const rate = Number(data?.rates?.[toCurrency]);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

export async function getLiveConversionRatesToMYR(): Promise<RatesMap> {
  const cached = readCachedRates();
  if (cached && Date.now() - cached.ts < RATES_CACHE_TTL_MS) return cached.rates;

  const currencies = await getCurrencies();
  const fallbackRates: RatesMap = { MYR: 1 };
  currencies.forEach((currency) => {
    if (currency.fallback_rate_to_myr && currency.fallback_rate_to_myr > 0) {
      fallbackRates[currency.code] = currency.fallback_rate_to_myr;
    }
  });

  try {
    const response = await fetch("/api/fx-rates?from=MYR");
    if (!response.ok) throw new Error("Frankfurter unavailable");
    const data = await response.json();
    const rates: RatesMap = { MYR: 1 };
    currencies.forEach((currency) => {
      const frankfurterRate = Number(data?.rates?.[currency.code]);
      if (currency.is_frankfurter_supported && Number.isFinite(frankfurterRate) && frankfurterRate > 0) {
        rates[currency.code] = 1 / frankfurterRate;
      } else {
        rates[currency.code] = fallbackRates[currency.code] || 1;
      }
    });
    writeCachedRates(rates);
    return rates;
  } catch {
    return fallbackRates;
  }
}

export async function convertToHomeCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  homeCurrency: CurrencyCode,
): Promise<ConversionResult> {
  const from = fromCurrency.toUpperCase();
  const to = homeCurrency.toUpperCase();
  if (from === to) return { amount, rate: 1, available: true };

  const currencies = await getCurrencies();
  const fromInfo = currencies.find((currency) => currency.code === from);
  const toInfo = currencies.find((currency) => currency.code === to);
  const bothSupported = Boolean(fromInfo?.is_frankfurter_supported && toInfo?.is_frankfurter_supported);

  if (bothSupported) {
    const directRate = await fetchFrankfurterRate(from, to);
    if (directRate) {
      return { amount: Math.round(amount * directRate * 100) / 100, rate: directRate, available: true };
    }
  }

  const rates = await getLiveConversionRatesToMYR();
  const fromRate = rates[from] || fromInfo?.fallback_rate_to_myr;
  const toRate = rates[to] || toInfo?.fallback_rate_to_myr;
  if (!fromRate || !toRate) return { amount, rate: 1, available: false };

  const rate = fromRate / toRate;
  return { amount: Math.round(amount * rate * 100) / 100, rate, available: true };
}

export const convertToHomeCurrencyLive = convertToHomeCurrency;

export function formatCurrencySpaced(amount: number, currency: CurrencyCode): string {
  const code = currency.toUpperCase();
  const info = getCachedCurrency(code);
  const symbol = info?.symbol || code;
  const decimals = info?.decimal_places ?? 2;
  return `${symbol} ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  return formatCurrencySpaced(amount, currency);
}

export async function convertPrice(priceInMYR: number, toCurrency: CurrencyCode): Promise<number> {
  const rates = await getLiveConversionRatesToMYR();
  const rate = rates[toCurrency.toUpperCase()] || 1;
  return Math.round(priceInMYR / rate);
}

export async function formatBudgetRangeWithCurrency(
  range: [number, number],
  currency: CurrencyCode,
): Promise<string> {
  const rates = await getLiveConversionRatesToMYR();
  const rate = rates[currency.toUpperCase()] || 1;
  return `${formatCurrency(range[0] / rate, currency)} – ${formatCurrency(range[1] / rate, currency)}`;
}

export const formatBudgetRangeWithCurrencyLive = formatBudgetRangeWithCurrency;

export async function getCurrency(code: string): Promise<Currency | null> {
  const currencies = await getCurrencies();
  return currencies.find((currency) => currency.code === code.trim().toUpperCase()) || null;
}

export async function getActiveCurrencyList(): Promise<Currency[]> {
  return getActiveCurrencies();
}

export function getCachedCurrencyList(): Currency[] {
  return getCachedCurrencies();
}
