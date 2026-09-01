export const DEFAULT_INPUT_CURRENCY = "USD";
export const DEFAULT_TARGET_CURRENCY = "CNY";
export const MAX_TARGET_CURRENCIES = 5;
export const MAJOR_CURRENCY_CODES = [
  "USD",
  "CNY",
  "EUR",
  "JPY",
  "GBP",
  "HKD",
  "TWD",
  "KRW",
  "SGD",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "INR",
  "BRL",
  "MXN",
] as const;

export interface CurrencyPreferences {
  inputCurrency: string;
  targetCurrencies: string[];
}

export interface RateTable {
  [currencyCode: string]: number;
}

export const DEFAULT_PREFERENCES: CurrencyPreferences = {
  inputCurrency: DEFAULT_INPUT_CURRENCY,
  targetCurrencies: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizePreferences(
  value: unknown,
  availableCurrencies: ReadonlySet<string>,
): CurrencyPreferences {
  if (!isRecord(value)) {
    return { ...DEFAULT_PREFERENCES };
  }

  const candidateInput =
    typeof value.inputCurrency === "string"
      ? value.inputCurrency.toUpperCase()
      : DEFAULT_INPUT_CURRENCY;
  const inputCurrency = availableCurrencies.has(candidateInput)
    ? candidateInput
    : DEFAULT_INPUT_CURRENCY;

  const rawTargets = Array.isArray(value.targetCurrencies)
    ? value.targetCurrencies
    : [];
  const targetCurrencies = rawTargets
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.toUpperCase())
    .filter(
      (item, index, items) =>
        availableCurrencies.has(item) && items.indexOf(item) === index,
    )
    .slice(0, MAX_TARGET_CURRENCIES);

  return { inputCurrency, targetCurrencies };
}

export function getEffectiveTargetCurrencies(
  preferences: CurrencyPreferences,
  availableCurrencies: ReadonlySet<string>,
): string[] {
  if (preferences.targetCurrencies.length > 0) {
    return preferences.targetCurrencies;
  }

  return availableCurrencies.has(DEFAULT_TARGET_CURRENCY)
    ? [DEFAULT_TARGET_CURRENCY]
    : [DEFAULT_INPUT_CURRENCY];
}

export function moveCurrencyToFront(codes: string[], code: string): string[] {
  const normalized = code.toUpperCase();
  const rest = codes.filter((item) => item !== normalized);
  if (rest.length === codes.length) {
    return [...codes];
  }
  return [normalized, ...rest];
}

export function mergeTargetSelection(current: string[], selected: string[]): string[] {
  const selectedSet = new Set(selected);
  const kept = current.filter((item) => selectedSet.has(item));
  const keptSet = new Set(kept);
  const added = selected.filter((item) => !keptSet.has(item));
  return [...kept, ...added].slice(0, MAX_TARGET_CURRENCIES);
}

export function convertAmount(
  amount: number,
  inputCurrency: string,
  targetCurrency: string,
  rates: RateTable,
): number | null {
  const inputRate = rates[inputCurrency];
  const targetRate = rates[targetCurrency];

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isFinite(inputRate) ||
    inputRate <= 0 ||
    !Number.isFinite(targetRate) ||
    targetRate <= 0
  ) {
    return null;
  }

  return (amount / inputRate) * targetRate;
}

export function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function sortCurrencyCodes(codes: Iterable<string>): string[] {
  const priority = new Map<string, number>(
    MAJOR_CURRENCY_CODES.map((code, index) => [code, index]),
  );

  return [...codes].sort((left, right) => {
    const leftPriority = priority.get(left);
    const rightPriority = priority.get(right);

    if (leftPriority !== undefined || rightPriority !== undefined) {
      if (leftPriority === undefined) return 1;
      if (rightPriority === undefined) return -1;
      return leftPriority - rightPriority;
    }

    return left.localeCompare(right, "en");
  });
}
