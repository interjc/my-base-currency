import {
  DEFAULT_PREFERENCES,
  MAX_TARGET_CURRENCIES,
  convertAmount,
  getEffectiveTargetCurrencies,
  parseAmount,
  sanitizePreferences,
  sortCurrencyCodes,
  type CurrencyPreferences,
  type RateTable,
} from "../lib/currency";

interface RatesApiResponse {
  baseCode: "USD";
  rates: RateTable;
  sourceUpdatedAt: number;
  sourceNextUpdateAt: number;
  cachedAt: number;
  cacheStatus: "hit" | "miss" | "stale";
}

const STORAGE_KEY = "base-money.preferences.v1";
function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing calculator element: ${selector}`);
  }
  return element;
}

const amountForm = required<HTMLFormElement>("#amount-form");
const amountInput = required<HTMLInputElement>("#amount");
const amountError = required<HTMLParagraphElement>("#amount-error");
const clearAmountButton = required<HTMLButtonElement>("#clear-amount");
const inputCurrencySelect = required<HTMLSelectElement>("#input-currency");
const resultList = required<HTMLUListElement>("#result-list");
const syncSignal = required<HTMLSpanElement>("#sync-signal");
const syncStatus = required<HTMLElement>("#sync-status");
const rateFreshness = required<HTMLElement>("#rate-freshness");
const errorPanel = required<HTMLElement>("#rates-error");
const retryRatesButton = required<HTMLButtonElement>("#retry-rates");
const openSettingsButton = required<HTMLButtonElement>("#open-settings");
const settingsDialog = required<HTMLDialogElement>("#settings-dialog");
const settingsForm = required<HTMLFormElement>("#settings-form");
const closeSettingsButton = required<HTMLButtonElement>("#close-settings");
const cancelSettingsButton = required<HTMLButtonElement>("#cancel-settings");
const resetSettingsButton = required<HTMLButtonElement>("#reset-settings");
const defaultInputSelect = required<HTMLSelectElement>("#default-input-currency");
const currencySearch = required<HTMLInputElement>("#currency-search");
const targetCurrencyList = required<HTMLDivElement>("#target-currency-list");
const selectionCount = required<HTMLOutputElement>("#selection-count");
const targetLimitMessage = required<HTMLParagraphElement>("#target-limit-message");

const currencyNames = new Intl.DisplayNames(["zh-CN"], { type: "currency" });
let rates: RateTable | null = null;
let availableCurrencies = new Set<string>();
let preferences: CurrencyPreferences = { ...DEFAULT_PREFERENCES };
let currentInputCurrency = DEFAULT_PREFERENCES.inputCurrency;

function isRatesApiResponse(value: unknown): value is RatesApiResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<RatesApiResponse>;
  return (
    candidate.baseCode === "USD" &&
    typeof candidate.rates === "object" &&
    candidate.rates !== null &&
    typeof candidate.rates.USD === "number" &&
    typeof candidate.rates.CNY === "number" &&
    typeof candidate.cachedAt === "number" &&
    ["hit", "miss", "stale"].includes(candidate.cacheStatus ?? "")
  );
}

function readPreferences(): unknown {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writePreferences(value: CurrencyPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    syncStatus.textContent = "设置已应用，但浏览器没有保存它";
  }
}

function currencyLabel(code: string): string {
  const name = currencyNames.of(code);
  return `${code} — ${name && name !== code ? name : "未知币种"}`;
}

function sortedCurrencyCodes(): string[] {
  return sortCurrencyCodes(availableCurrencies);
}

function populateSelect(select: HTMLSelectElement, selectedCode: string): void {
  const fragment = document.createDocumentFragment();
  for (const code of sortedCurrencyCodes()) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = currencyLabel(code);
    fragment.append(option);
  }
  select.replaceChildren(fragment);
  select.value = availableCurrencies.has(selectedCode) ? selectedCode : "USD";
}

function formatAmount(value: number, currency: string): string {
  const magnitude = Math.abs(value);
  const maximumFractionDigits = magnitude > 0 && magnitude < 1 ? 4 : 2;
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

function renderResults(): void {
  if (!rates) {
    return;
  }

  const amount = parseAmount(amountInput.value);
  const targets = getEffectiveTargetCurrencies(preferences, availableCurrencies);
  const fragment = document.createDocumentFragment();

  targets.forEach((code, index) => {
    const converted = amount === null
      ? null
      : convertAmount(amount, currentInputCurrency, code, rates as RateTable);
    const item = document.createElement("li");
    item.className = `result-card tone-${(index % 5) + 1}`;
    item.dataset.currency = code;

    const codeElement = document.createElement("span");
    codeElement.className = "result-code";
    codeElement.textContent = currencyLabel(code);

    const valueElement = document.createElement("strong");
    valueElement.className = "result-value";
    valueElement.dataset.resultValue = "";
    valueElement.dataset.rawValue = converted === null ? "" : String(converted);
    valueElement.textContent = converted === null ? "—" : formatAmount(converted, code);

    const rateElement = document.createElement("small");
    const oneUnit = convertAmount(1, currentInputCurrency, code, rates as RateTable);
    rateElement.textContent = oneUnit === null
      ? "汇率不可用"
      : `1 ${currentInputCurrency} ≈ ${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(oneUnit)} ${code}`;

    item.append(codeElement, valueElement, rateElement);
    fragment.append(item);
  });

  resultList.replaceChildren(fragment);
}

function validateAmount(showError: boolean): boolean {
  const rawValue = amountInput.value.trim();
  const valid = rawValue === "" || parseAmount(rawValue) !== null;

  amountInput.toggleAttribute("aria-invalid", !valid);
  amountError.textContent = !valid && showError
    ? "请输入一个非负金额，例如 64 或 64.5。"
    : "";
  return valid;
}

function updateClearAmountButton(): void {
  clearAmountButton.disabled = amountInput.value === "";
}

function renderRateStatus(payload: RatesApiResponse): void {
  const sourceDate = new Date(payload.sourceUpdatedAt * 1_000);
  const timeLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(sourceDate);

  syncSignal.classList.remove("is-loading", "is-warning");
  if (payload.cacheStatus === "stale") {
    syncSignal.classList.add("is-warning");
    syncStatus.textContent = "上游暂时离线，正在使用缓存行情";
  } else if (payload.cacheStatus === "miss") {
    syncStatus.textContent = "汇率已更新";
  } else {
    syncStatus.textContent = "汇率数据正常";
  }
  rateFreshness.textContent = `上游数据更新于 ${timeLabel}`;
}

async function loadRates(): Promise<void> {
  syncSignal.classList.add("is-loading");
  syncSignal.classList.remove("is-warning");
  syncStatus.textContent = "正在同步汇率…";
  rateFreshness.textContent = "首次加载需要连接网络";
  errorPanel.hidden = true;
  retryRatesButton.disabled = true;

  try {
    const response = await fetch("/api/rates", {
      headers: { Accept: "application/json" },
    });
    const payload: unknown = await response.json();
    if (!response.ok || !isRatesApiResponse(payload)) {
      throw new Error("Invalid rates response");
    }

    rates = Object.fromEntries(
      Object.entries(payload.rates).filter(
        ([code, rate]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0,
      ),
    );
    availableCurrencies = new Set(Object.keys(rates));
    preferences = sanitizePreferences(readPreferences(), availableCurrencies);
    currentInputCurrency = preferences.inputCurrency;

    populateSelect(inputCurrencySelect, currentInputCurrency);
    populateSelect(defaultInputSelect, preferences.inputCurrency);
    renderRateStatus(payload);
    renderResults();
  } catch {
    rates = null;
    syncSignal.classList.remove("is-loading");
    syncSignal.classList.add("is-warning");
    syncStatus.textContent = "汇率同步失败";
    rateFreshness.textContent = "检查网络后可以重新尝试";
    errorPanel.hidden = false;
  } finally {
    retryRatesButton.disabled = false;
  }
}

function selectedTargetInputs(): HTMLInputElement[] {
  return [...targetCurrencyList.querySelectorAll<HTMLInputElement>("input[type='checkbox']:checked")];
}

function updateTargetLimit(announce = false): void {
  const selected = selectedTargetInputs();
  const atLimit = selected.length >= MAX_TARGET_CURRENCIES;
  selectionCount.value = `${selected.length} / ${MAX_TARGET_CURRENCIES}`;
  selectionCount.textContent = selectionCount.value;

  for (const checkbox of targetCurrencyList.querySelectorAll<HTMLInputElement>("input[type='checkbox']")) {
    checkbox.disabled = atLimit && !checkbox.checked;
  }

  targetLimitMessage.textContent = announce && atLimit
    ? "已选择 5 个本位币；取消一个后才能继续选择。"
    : "";
}

function filterTargetCurrencies(): void {
  const query = currencySearch.value.trim().toLocaleLowerCase("zh-CN");
  for (const choice of targetCurrencyList.querySelectorAll<HTMLElement>(".currency-choice")) {
    const searchable = choice.dataset.searchable ?? "";
    choice.hidden = query !== "" && !searchable.includes(query);
  }
}

function populateTargetCurrencies(): void {
  const selected = new Set(preferences.targetCurrencies);
  const fragment = document.createDocumentFragment();

  for (const code of sortedCurrencyCodes()) {
    const label = document.createElement("label");
    label.className = "currency-choice";
    label.dataset.currency = code;
    label.dataset.searchable = `${code} ${currencyNames.of(code) ?? ""}`.toLocaleLowerCase("zh-CN");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "targetCurrency";
    checkbox.value = code;
    checkbox.checked = selected.has(code);

    const marker = document.createElement("span");
    marker.className = "choice-marker";
    marker.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = code;
    const small = document.createElement("small");
    small.textContent = currencyNames.of(code) ?? "未知币种";
    copy.append(strong, small);

    label.append(checkbox, marker, copy);
    fragment.append(label);
  }

  targetCurrencyList.replaceChildren(fragment);
  updateTargetLimit();
}

function openSettings(): void {
  if (!rates) {
    syncStatus.textContent = "汇率加载完成后才能选择币种";
    return;
  }

  populateSelect(defaultInputSelect, preferences.inputCurrency);
  populateTargetCurrencies();
  currencySearch.value = "";
  targetLimitMessage.textContent = "";
  settingsDialog.showModal();
}

amountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  validateAmount(true);
  amountInput.blur();
});

amountInput.addEventListener("input", () => {
  validateAmount(false);
  updateClearAmountButton();
  renderResults();
});
amountInput.addEventListener("blur", () => validateAmount(true));

clearAmountButton.addEventListener("click", () => {
  amountInput.value = "";
  validateAmount(false);
  updateClearAmountButton();
  renderResults();
  amountInput.focus();
});

inputCurrencySelect.addEventListener("change", () => {
  currentInputCurrency = inputCurrencySelect.value;
  renderResults();
});

retryRatesButton.addEventListener("click", loadRates);
openSettingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", () => settingsDialog.close());
cancelSettingsButton.addEventListener("click", () => settingsDialog.close());

currencySearch.addEventListener("input", filterTargetCurrencies);
targetCurrencyList.addEventListener("change", (event) => {
  if (event.target instanceof HTMLInputElement) {
    updateTargetLimit(true);
  }
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextPreferences = {
    inputCurrency: defaultInputSelect.value,
    targetCurrencies: selectedTargetInputs().map((input) => input.value),
  };
  preferences = sanitizePreferences(nextPreferences, availableCurrencies);
  currentInputCurrency = preferences.inputCurrency;
  writePreferences(preferences);
  populateSelect(inputCurrencySelect, currentInputCurrency);
  renderResults();
  settingsDialog.close();
  syncStatus.textContent = "默认币种设置已保存";
});

resetSettingsButton.addEventListener("click", () => {
  preferences = { ...DEFAULT_PREFERENCES };
  currentInputCurrency = preferences.inputCurrency;
  writePreferences(preferences);
  populateSelect(inputCurrencySelect, currentInputCurrency);
  renderResults();
  settingsDialog.close();
  syncStatus.textContent = "已恢复 USD → CNY 默认设置";
});

settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    settingsDialog.close();
  }
});

updateClearAmountButton();
void loadRates();
