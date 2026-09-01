import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  detectSystemLocale,
  parseLocale,
  readStoredLocale,
  sanitizeLocale,
  translate,
} from "./i18n";

describe("locale parsing", () => {
  it("accepts supported locales and otherwise falls back to Simplified Chinese", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("zh-HK")).toBe("zh-HK");
    expect(parseLocale("ja")).toBe("ja");
    expect(parseLocale("fr")).toBeNull();
    expect(sanitizeLocale("nope")).toBe(DEFAULT_LOCALE);
    expect(sanitizeLocale(null)).toBe("zh-CN");
  });

  it("reads a locale from the shared preferences blob", () => {
    expect(readStoredLocale({ locale: "ja", inputCurrency: "USD" })).toBe("ja");
    expect(readStoredLocale({ inputCurrency: "USD" })).toBeNull();
    expect(readStoredLocale("en")).toBe("en");
    expect(readStoredLocale(null)).toBeNull();
  });
});

describe("detectSystemLocale", () => {
  it("maps browser languages onto the supported locales", () => {
    expect(detectSystemLocale(["en-US", "en"])).toBe("en");
    expect(detectSystemLocale(["ja-JP"])).toBe("ja");
    expect(detectSystemLocale(["zh-CN"])).toBe("zh-CN");
    expect(detectSystemLocale(["zh"])).toBe("zh-CN");
    expect(detectSystemLocale(["zh-Hans-CN"])).toBe("zh-CN");
    expect(detectSystemLocale(["zh-TW"])).toBe("zh-HK");
    expect(detectSystemLocale(["zh-Hant-HK"])).toBe("zh-HK");
    expect(detectSystemLocale(["zh-MO"])).toBe("zh-HK");
    expect(detectSystemLocale(["zh-HK"])).toBe("zh-HK");
  });

  it("uses later fallbacks and ignores unsupported languages", () => {
    expect(detectSystemLocale(["fr-FR"])).toBeNull();
    expect(detectSystemLocale(["fr-FR", "en-GB"])).toBe("en");
    expect(detectSystemLocale(["de-DE", "ja"])).toBe("ja");
    expect(detectSystemLocale([])).toBeNull();
  });
});

describe("translate", () => {
  it("interpolates variables for the active locale", () => {
    expect(translate("en", "sourceNoteReady", { time: "May 1, 09:00" })).toBe(
      " · updated May 1, 09:00 · estimates only",
    );
    expect(translate("zh-CN", "slogan")).toBe("看心里有数的价格");
    expect(translate("zh-HK", "slogan")).toBe("看心裡有數的價格");
    expect(translate("ja", "slogan")).toBe("心でわかる値段");
  });
});
