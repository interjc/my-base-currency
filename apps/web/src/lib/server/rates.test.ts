import { describe, expect, it, vi } from "vitest";

import {
  RATE_CACHE_KEY,
  RATE_FRESHNESS_MS,
  RATE_RETENTION_SECONDS,
  getExchangeRates,
  parseUpstreamRates,
  type CachedRateTable,
  type RateCache,
} from "./rates";

class MemoryRateCache implements RateCache {
  value: unknown = null;
  putCalls: Array<{ key: string; value: string; expirationTtl: number }> = [];

  async get<T>(_key: string, _type: "json"): Promise<T | null> {
    return this.value as T | null;
  }

  async put(
    key: string,
    value: string,
    options: { expirationTtl: number },
  ): Promise<void> {
    this.value = JSON.parse(value);
    this.putCalls.push({ key, value, expirationTtl: options.expirationTtl });
  }
}

const now = 1_800_000_000_000;
const upstreamPayload = {
  result: "success",
  base_code: "USD",
  time_last_update_unix: 1_799_996_400,
  time_next_update_unix: 1_800_003_600,
  rates: { USD: 1, CNY: 7.1, EUR: 0.9, INVALID: 8, JPY: -1 },
};

function cachedRateTable(cachedAt: number): CachedRateTable {
  return {
    baseCode: "USD",
    rates: { USD: 1, CNY: 7, EUR: 0.8 },
    sourceUpdatedAt: 1_799_996_400,
    sourceNextUpdateAt: 1_800_003_600,
    cachedAt,
  };
}

function jsonFetcher(payload: unknown, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

describe("parseUpstreamRates", () => {
  it("keeps only valid ISO-like positive rates", () => {
    const parsed = parseUpstreamRates(upstreamPayload, now);
    expect(parsed.rates).toEqual({ USD: 1, CNY: 7.1, EUR: 0.9 });
  });

  it("rejects a malformed or unsuccessful table", () => {
    expect(() =>
      parseUpstreamRates({ ...upstreamPayload, rates: { USD: 1 } }, now),
    ).toThrow(/valid USD rate table/);
  });
});

describe("getExchangeRates", () => {
  it("returns a fresh KV hit without calling the upstream API", async () => {
    const cache = new MemoryRateCache();
    cache.value = cachedRateTable(now - 1_000);
    const fetcher = jsonFetcher(upstreamPayload);

    const result = await getExchangeRates(cache, { now, fetcher });

    expect(result.cacheStatus).toBe("hit");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refreshes and stores a cache miss", async () => {
    const cache = new MemoryRateCache();

    const result = await getExchangeRates(cache, {
      now,
      fetcher: jsonFetcher(upstreamPayload),
    });

    expect(result.cacheStatus).toBe("miss");
    expect(result.rates.CNY).toBe(7.1);
    expect(cache.putCalls[0]).toMatchObject({
      key: RATE_CACHE_KEY,
      expirationTtl: RATE_RETENTION_SECONDS,
    });
  });

  it("uses retained stale data when refresh fails", async () => {
    const cache = new MemoryRateCache();
    cache.value = cachedRateTable(now - RATE_FRESHNESS_MS - 1);

    const result = await getExchangeRates(cache, {
      now,
      fetcher: jsonFetcher({ error: true }, 503),
    });

    expect(result.cacheStatus).toBe("stale");
    expect(result.rates.CNY).toBe(7);
  });

  it("fails when both upstream and retained cache are unavailable", async () => {
    const cache = new MemoryRateCache();
    cache.value = cachedRateTable(now - RATE_RETENTION_SECONDS * 1_000 - 1);

    await expect(
      getExchangeRates(cache, {
        now,
        fetcher: jsonFetcher({ error: true }, 503),
      }),
    ).rejects.toThrow("currently unavailable");
  });
});
