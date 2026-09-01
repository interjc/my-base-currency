import { describe, expect, it } from "vitest";

import {
  convertAmount,
  getEffectiveTargetCurrencies,
  mergeTargetSelection,
  moveCurrencyToFront,
  parseAmount,
  sanitizePreferences,
  sortCurrencyCodes,
} from "./currency";

const currencies = new Set(["USD", "CNY", "EUR", "JPY", "GBP", "AUD"]);

describe("convertAmount", () => {
  it("calculates a cross-rate from the USD-normalized table", () => {
    const result = convertAmount(10, "EUR", "CNY", {
      USD: 1,
      EUR: 0.8,
      CNY: 7.2,
    });

    expect(result).toBe(90);
  });

  it("returns null for unavailable or invalid rates", () => {
    expect(convertAmount(10, "USD", "CNY", { USD: 1 })).toBeNull();
    expect(convertAmount(-1, "USD", "CNY", { USD: 1, CNY: 7 })).toBeNull();
  });
});

describe("preferences", () => {
  it("normalizes, deduplicates, validates, and caps targets", () => {
    expect(
      sanitizePreferences(
        {
          locale: "en",
          inputCurrency: "eur",
          targetCurrencies: ["cny", "JPY", "CNY", "GBP", "AUD", "USD", "XXX"],
        },
        currencies,
      ),
    ).toEqual({
      inputCurrency: "EUR",
      targetCurrencies: ["CNY", "JPY", "GBP", "AUD", "USD"],
    });
  });

  it("uses CNY as the effective target when none is stored", () => {
    const preferences = sanitizePreferences({}, currencies);
    expect(getEffectiveTargetCurrencies(preferences, currencies)).toEqual(["CNY"]);
  });

  it("moves a selected currency to the front and keeps the rest", () => {
    expect(moveCurrencyToFront(["CNY", "JPY", "EUR"], "jpy")).toEqual(["JPY", "CNY", "EUR"]);
    expect(moveCurrencyToFront(["CNY", "JPY"], "GBP")).toEqual(["CNY", "JPY"]);
  });

  it("keeps the current order when merging a settings selection", () => {
    expect(mergeTargetSelection(["JPY", "CNY"], ["CNY", "JPY", "EUR"])).toEqual([
      "JPY",
      "CNY",
      "EUR",
    ]);
  });
});

describe("parseAmount", () => {
  it("accepts decimal comma and zero", () => {
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("0")).toBe(0);
  });

  it("rejects ambiguous or negative input", () => {
    expect(parseAmount("1,000.00")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
  });
});

describe("sortCurrencyCodes", () => {
  it("places major currencies first and alphabetizes the remainder", () => {
    expect(sortCurrencyCodes(["ZAR", "JPY", "AED", "CNY", "USD", "NOK", "EUR"])).toEqual([
      "USD",
      "CNY",
      "EUR",
      "JPY",
      "AED",
      "NOK",
      "ZAR",
    ]);
  });
});
