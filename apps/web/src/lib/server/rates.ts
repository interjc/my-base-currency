export const UPSTREAM_RATES_URL = "https://open.er-api.com/v6/latest/USD";
export const RATE_CACHE_KEY = "rates:usd:v1";
export const RATE_FRESHNESS_MS = 60 * 60 * 1_000;
export const RATE_RETENTION_SECONDS = 48 * 60 * 60;

export interface RateCache {
  get<T>(key: string, type: "json"): Promise<T | null>;
  put(
    key: string,
    value: string,
    options: { expirationTtl: number },
  ): Promise<void>;
}

export interface CachedRateTable {
  baseCode: "USD";
  rates: Record<string, number>;
  sourceUpdatedAt: number;
  sourceNextUpdateAt: number;
  cachedAt: number;
}

export interface ExchangeRateResult extends CachedRateTable {
  cacheStatus: "hit" | "miss" | "stale";
}

interface GetExchangeRatesOptions {
  fetcher?: typeof fetch;
  now?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeRates(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null;
  }

  const validEntries = Object.entries(value).filter(
    (entry): entry is [string, number] =>
      /^[A-Z]{3}$/.test(entry[0]) && isPositiveFiniteNumber(entry[1]),
  );
  const rates: Record<string, number> = Object.fromEntries(validEntries);
  rates.USD = 1;

  return isPositiveFiniteNumber(rates.CNY) ? rates : null;
}

function isCachedRateTable(value: unknown): value is CachedRateTable {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.baseCode === "USD" &&
    normalizeRates(value.rates) !== null &&
    typeof value.sourceUpdatedAt === "number" &&
    Number.isFinite(value.sourceUpdatedAt) &&
    typeof value.sourceNextUpdateAt === "number" &&
    Number.isFinite(value.sourceNextUpdateAt) &&
    typeof value.cachedAt === "number" &&
    Number.isFinite(value.cachedAt)
  );
}

export function parseUpstreamRates(value: unknown, cachedAt: number): CachedRateTable {
  if (!isRecord(value)) {
    throw new Error("The upstream response is not an object.");
  }

  const rates = normalizeRates(value.rates);
  if (value.result !== "success" || value.base_code !== "USD" || !rates) {
    throw new Error("The upstream response does not contain a valid USD rate table.");
  }

  const sourceUpdatedAt = value.time_last_update_unix;
  const sourceNextUpdateAt = value.time_next_update_unix;
  if (
    typeof sourceUpdatedAt !== "number" ||
    !Number.isFinite(sourceUpdatedAt) ||
    typeof sourceNextUpdateAt !== "number" ||
    !Number.isFinite(sourceNextUpdateAt)
  ) {
    throw new Error("The upstream response is missing update timestamps.");
  }

  return {
    baseCode: "USD",
    rates,
    sourceUpdatedAt,
    sourceNextUpdateAt,
    cachedAt,
  };
}

async function readCachedRates(cache: RateCache): Promise<CachedRateTable | null> {
  try {
    const value = await cache.get<unknown>(RATE_CACHE_KEY, "json");
    return isCachedRateTable(value) ? value : null;
  } catch (error) {
    console.error("Unable to read the exchange-rate cache.", error);
    return null;
  }
}

export async function getExchangeRates(
  cache: RateCache,
  options: GetExchangeRatesOptions = {},
): Promise<ExchangeRateResult> {
  const now = options.now ?? Date.now();
  const fetcher = options.fetcher ?? fetch;
  const cached = await readCachedRates(cache);
  const cacheAge = cached ? now - cached.cachedAt : Number.POSITIVE_INFINITY;

  if (cached && cacheAge >= 0 && cacheAge < RATE_FRESHNESS_MS) {
    return { ...cached, cacheStatus: "hit" };
  }

  try {
    const response = await fetcher(UPSTREAM_RATES_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`The upstream service returned HTTP ${response.status}.`);
    }

    const fresh = parseUpstreamRates(await response.json(), now);

    try {
      await cache.put(RATE_CACHE_KEY, JSON.stringify(fresh), {
        expirationTtl: RATE_RETENTION_SECONDS,
      });
    } catch (error) {
      console.error("Unable to update the exchange-rate cache.", error);
    }

    return { ...fresh, cacheStatus: "miss" };
  } catch (error) {
    const withinRetention =
      cached && cacheAge >= 0 && cacheAge < RATE_RETENTION_SECONDS * 1_000;

    if (cached && withinRetention) {
      console.error("Using stale exchange rates after an upstream failure.", error);
      return { ...cached, cacheStatus: "stale" };
    }

    throw new Error("Exchange rates are currently unavailable.", { cause: error });
  }
}
