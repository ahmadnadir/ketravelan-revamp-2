export type CurrencyCode =
  | "MYR"
  | "USD"
  | "EUR"
  | "IDR"
  | "SGD"
  | "THB"
  | "VND"
  | "PHP"
  | "CNY"
  | "HKD"
  | "GBP"
  | "AUD"
  | "CAD"
  | "JPY"
  | "KRW";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
}

export const currencies: CurrencyInfo[] = [
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "THB", symbol: "฿", name: "Thai Baht", flag: "🇹🇭" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", flag: "🇻🇳" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", flag: "🇵🇭" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", flag: "🇭🇰" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", flag: "🇰🇷" },
];

// Get currency info by code
export function getCurrencyInfo(code: CurrencyCode): CurrencyInfo | undefined {
  return currencies.find((c) => c.code === code);
}

// Travel currencies only (for expense entry)
export const travelCurrencies = currencies.filter(c => c.code !== "MYR");

// Approximate conversion rates TO MYR (base currency)
// Last updated: April 6, 2026 - Fetched live from Frankfurter API
export const conversionRatesToMYR: Record<CurrencyCode, number> = {
  MYR: 1,
  USD: 4.04,
  EUR: 4.66,
  IDR: 0.000237,
  SGD: 3.14,
  THB: 0.123,
  VND: 0.000183,
  PHP: 0.0667,
  CNY: 0.586,
  HKD: 0.515,
  GBP: 5.34,
  AUD: 2.78,
  CAD: 2.91,
  JPY: 0.0253,
  KRW: 0.00266,
};

// Legacy: rates FROM MYR (for backward compatibility)
export const conversionRates: Record<CurrencyCode, number> = (Object.keys(
  conversionRatesToMYR
) as CurrencyCode[]).reduce((acc, code) => {
  acc[code] = 1 / conversionRatesToMYR[code];
  return acc;
}, {} as Record<CurrencyCode, number>);

// --- Live rates integration (real API) ---
// Source: exchangerate.host (free, no API key). We fetch rates with base MYR
// and invert them to get per-currency -> MYR conversion.
const RATES_CACHE_KEY = "currencyRatesToMYR:cache";
const RATES_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

type RatesMap = Record<CurrencyCode, number>;

function readCachedRates(): { rates: RatesMap; ts: number } | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.rates || !parsed.ts) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedRates(rates: RatesMap) {
  try {
    localStorage.setItem(
      RATES_CACHE_KEY,
      JSON.stringify({ rates, ts: Date.now() })
    );
  } catch {
    // ignore cache write errors
  }
}

export async function getLiveConversionRatesToMYR(): Promise<RatesMap> {
  const cached = readCachedRates();
  if (cached && Date.now() - cached.ts < RATES_CACHE_TTL_MS) {
    return cached.rates;
  }

  try {
    // Fetch rates from Frankfurter API (free, no API key required)
    // https://api.frankfurter.app/latest?from=MYR returns rates FOR MYR (MYR -> other currencies)
    const url = `https://api.frankfurter.app/latest?from=MYR`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch FX rates: ${res.status}`);
    const data = await res.json();
    const toOtherCurrencies: Record<string, number> = data?.rates || {};

    // Invert to get per-currency -> MYR conversion (e.g., USD_to_MYR = 1 / (MYR_to_USD))
    const live: RatesMap = currencies.reduce((acc, currency) => {
      if (currency.code === "MYR") {
        acc[currency.code] = 1;
      } else {
        acc[currency.code] = toOtherCurrencies[currency.code]
          ? 1 / toOtherCurrencies[currency.code]
          : conversionRatesToMYR[currency.code];
      }
      return acc;
    }, {} as RatesMap);

    writeCachedRates(live);
    return live;
  } catch {
    // Fallback to static defaults
    return { ...conversionRatesToMYR };
  }
}

export interface ConversionResult {
  amount: number;
  rate: number;
  available: boolean;
}

// Convert from any currency to home currency using live rates
export async function convertToHomeCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  homeCurrency: CurrencyCode
): Promise<ConversionResult> {
  if (fromCurrency === homeCurrency) {
    return { amount, rate: 1, available: true };
  }
  
  const rates = await getLiveConversionRatesToMYR();
  const rate = rates[fromCurrency] / rates[homeCurrency];
  const convertedAmount = amount * rate;
  
  return {
    amount: Math.round(convertedAmount * 100) / 100,
    rate,
    available: true,
  };
}

// Alias for backward compatibility
export const convertToHomeCurrencyLive = convertToHomeCurrency;

// Format currency with proper spacing: "RM 5,000" not "RM5,000"
export function formatCurrencySpaced(amount: number, currency: CurrencyCode): string {
  const currencyInfo = currencies.find((c) => c.code === currency);
  const symbol = currencyInfo?.symbol || currency;
  
  if (currency === "IDR") {
    if (amount >= 1000000) {
      return `${symbol} ${(amount / 1000000).toFixed(1)}jt`;
    }
    if (amount >= 1000) {
      return `${symbol} ${Math.round(amount / 1000)}k`;
    }
  }
  
  return `${symbol} ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function convertPrice(priceInMYR: number, toCurrency: CurrencyCode): Promise<number> {
  const rates = await getLiveConversionRatesToMYR();
  // Convert MYR to target currency: target = MYR / (currency_to_MYR rate)
  const toCurrencyRate = 1 / rates[toCurrency];
  return Math.round(priceInMYR * toCurrencyRate);
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const currencyInfo = currencies.find((c) => c.code === currency);
  const symbol = currencyInfo?.symbol || currency;
  
  if (currency === "IDR") {
    // Format large IDR amounts with 'k' or 'jt' (juta = million)
    if (amount >= 1000000) {
      return `${symbol} ${(amount / 1000000).toFixed(1)}jt`;
    }
    if (amount >= 1000) {
      return `${symbol} ${Math.round(amount / 1000)}k`;
    }
  }
  
  return `${symbol} ${amount.toLocaleString()}`;
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  const currencyInfo = currencies.find((c) => c.code === currency);
  return currencyInfo?.symbol || currency;
}

export async function formatBudgetRangeWithCurrency(
  range: [number, number],
  currency: CurrencyCode
): Promise<string> {
  const rates = await getLiveConversionRatesToMYR();
  const formatPrice = (priceInMYR: number) => {
    // Convert MYR -> target using live rates: target = MYR / (currency_to_MYR rate)
    const toCurrencyRate = 1 / rates[currency];
    const converted = Math.round(priceInMYR * toCurrencyRate);
    if (priceInMYR >= 10000) {
      return formatCurrency(converted, currency) + "+";
    }
    return formatCurrency(converted, currency);
  };
  return `${formatPrice(range[0])} – ${formatPrice(range[1])}`;
}

// Alias for backward compatibility
export const formatBudgetRangeWithCurrencyLive = formatBudgetRangeWithCurrency;

// Destination to currency mapping for auto-suggestion
const destinationCurrencyMap: Record<string, CurrencyCode> = {
  // Indonesia
  'indonesia': 'IDR',
  'bali': 'IDR',
  'jakarta': 'IDR',
  'lombok': 'IDR',
  'yogyakarta': 'IDR',
  'bandung': 'IDR',
  'surabaya': 'IDR',
  
  // USA
  'united states': 'USD',
  'usa': 'USD',
  'america': 'USD',
  'new york': 'USD',
  'california': 'USD',
  'hawaii': 'USD',
  'los angeles': 'USD',
  'san francisco': 'USD',
  'las vegas': 'USD',
  
  // Europe (Eurozone)
  'europe': 'EUR',
  'france': 'EUR',
  'paris': 'EUR',
  'germany': 'EUR',
  'berlin': 'EUR',
  'spain': 'EUR',
  'barcelona': 'EUR',
  'madrid': 'EUR',
  'italy': 'EUR',
  'rome': 'EUR',
  'milan': 'EUR',
  'amsterdam': 'EUR',
  'netherlands': 'EUR',
  'belgium': 'EUR',
  'brussels': 'EUR',
  'portugal': 'EUR',
  'lisbon': 'EUR',
  'greece': 'EUR',
  'athens': 'EUR',
  'austria': 'EUR',
  'vienna': 'EUR',
  
  // Malaysia (home country)
  'malaysia': 'MYR',
  'kuala lumpur': 'MYR',
  'langkawi': 'MYR',
  'penang': 'MYR',
  'malacca': 'MYR',
  'kota kinabalu': 'MYR',
};

export function suggestCurrencyFromDestination(destination: string): CurrencyCode | null {
  if (!destination) return null;
  
  const normalized = destination.toLowerCase().trim();
  for (const [key, currency] of Object.entries(destinationCurrencyMap)) {
    if (normalized.includes(key)) {
      return currency;
    }
  }
  return null;
}
