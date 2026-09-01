import {
  DEFAULT_PREFERENCES,
  MAX_TARGET_CURRENCIES,
  convertAmount,
  getEffectiveTargetCurrencies,
  mergeTargetSelection,
  moveCurrencyToFront,
  parseAmount,
  sanitizePreferences,
  sortCurrencyCodes,
  type CurrencyPreferences,
  type RateTable,
} from "../lib/currency";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  PREFERENCES_STORAGE_KEY,
  detectSystemLocale,
  isLocale,
  isMessageKey,
  readStoredLocale,
  translate,
  type Locale,
  type MessageKey,
} from "../lib/i18n";

interface RatesApiResponse {
  baseCode: "USD";
  rates: RateTable;
  sourceUpdatedAt: number;
  sourceNextUpdateAt: number;
  cachedAt: number;
  cacheStatus: "hit" | "miss" | "stale";
}

type RatesView = "loading" | "ready" | "error";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing calculator element: ${selector}`);
  }
  return element;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const amountForm = required<HTMLFormElement>("#amount-form");
const amountInput = required<HTMLTextAreaElement>("#amount");
const amountControl = required<HTMLElement>(".amount-control");
const amountShell = required<HTMLElement>(".amount-field-shell");
const amountError = required<HTMLParagraphElement>("#amount-error");
const clearAmountButton = required<HTMLButtonElement>("#clear-amount");
const inputCurrencySelect = required<HTMLSelectElement>("#input-currency");
const resultList = required<HTMLUListElement>("#result-list");
const addTargetButton = required<HTMLButtonElement>("#add-target");
const addCurrencyDialog = required<HTMLDialogElement>("#add-currency-dialog");
const addCurrencySearch = required<HTMLInputElement>("#add-currency-search");
const addCurrencyList = required<HTMLDivElement>("#add-currency-list");
const closeAddCurrencyButton = required<HTMLButtonElement>("#close-add-currency");
const syncSignal = required<HTMLSpanElement>("#sync-signal");
const syncStatus = required<HTMLElement>("#sync-status");
const sourceNoteStatus = required<HTMLElement>("#source-note-status");
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
const languageSwitcher = required<HTMLDivElement>("#language-switcher");
const openLanguageButton = required<HTMLButtonElement>("#open-language");
const languageMenu = required<HTMLDivElement>("#language-menu");
const languageFlag = required<HTMLSpanElement>("#language-flag");
const localePrompt = required<HTMLDialogElement>("#locale-prompt");
const localePromptFlag = required<HTMLElement>("#locale-prompt-flag");
const localePromptTitle = required<HTMLElement>("#locale-prompt-title");
const localePromptCopy = required<HTMLElement>("#locale-prompt-copy");
const localePromptKeep = required<HTMLButtonElement>("#locale-prompt-keep");
const localePromptSwitch = required<HTMLButtonElement>("#locale-prompt-switch");

let locale: Locale = DEFAULT_LOCALE;
let currencyNames = new Intl.DisplayNames([LOCALE_META[locale].intl], { type: "currency" });
let rates: RateTable | null = null;
let availableCurrencies = new Set<string>();
let preferences: CurrencyPreferences = { ...DEFAULT_PREFERENCES };
let currentInputCurrency = DEFAULT_PREFERENCES.inputCurrency;
let lastRatesPayload: RatesApiResponse | null = null;
let ratesView: RatesView = "loading";
let recommendedLocale: Locale | null = null;

function t(key: MessageKey, vars: Record<string, string> = {}): string {
  return translate(locale, key, vars);
}

function refreshFormatters(): void {
  currencyNames = new Intl.DisplayNames([LOCALE_META[locale].intl], { type: "currency" });
}

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

function readRawStorage(): Record<string, unknown> | null {
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed: unknown = JSON.parse(stored);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeRawStorage(value: Record<string, unknown>): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(value));
  } catch {
    syncStatus.textContent = t("storageFailed");
  }
}

function persistLocale(next: Locale): void {
  writeRawStorage({
    ...(readRawStorage() ?? {}),
    locale: next,
  });
}

function writePreferences(value: CurrencyPreferences): void {
  writeRawStorage({
    ...(readRawStorage() ?? {}),
    locale,
    inputCurrency: value.inputCurrency,
    targetCurrencies: value.targetCurrencies,
  });
}

function persistInputCurrency(code: string): void {
  preferences = sanitizePreferences(
    {
      ...preferences,
      inputCurrency: code,
    },
    availableCurrencies,
  );
  currentInputCurrency = preferences.inputCurrency;
  writePreferences(preferences);
}

function workingTargets(): string[] {
  return getEffectiveTargetCurrencies(preferences, availableCurrencies);
}

function persistTargets(next: string[]): void {
  preferences = sanitizePreferences(
    {
      ...preferences,
      targetCurrencies: next,
    },
    availableCurrencies,
  );
  writePreferences(preferences);
  renderResults();
}

function addTarget(code: string): void {
  const current = workingTargets();
  if (current.includes(code) || current.length >= MAX_TARGET_CURRENCIES) {
    return;
  }
  persistTargets([...current, code]);
}

function removeTarget(code: string): void {
  persistTargets(workingTargets().filter((item) => item !== code));
}

function pinTarget(code: string): void {
  persistTargets(moveCurrencyToFront(workingTargets(), code));
}

function iconSvg(pathData: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", pathData);
  svg.append(path);
  return svg;
}

function trashIcon(): SVGSVGElement {
  return iconSvg(
    "M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM8 9h2v9H8V9zm-1 12h10l1-12H6l1 12z",
  );
}

function pinIcon(): SVGSVGElement {
  return iconSvg("M3 2h18v3H3V2zm9 5 6 6h-4v9h-4v-9H6l6-6z");
}

function hasExplicitLocale(): boolean {
  return readStoredLocale(readRawStorage()) !== null;
}

function currencyLabel(code: string): string {
  const name = currencyNames.of(code);
  return `${code} — ${name && name !== code ? name : t("unknownCurrency")}`;
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
  return new Intl.NumberFormat(LOCALE_META[locale].intl, {
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
      ? t("rateUnavailable")
      : `1 ${currentInputCurrency} ≈ ${new Intl.NumberFormat(LOCALE_META[locale].intl, { maximumFractionDigits: 4 }).format(oneUnit)} ${code}`;

    const actions = document.createElement("div");
    actions.className = "result-actions";

    const pinButton = document.createElement("button");
    pinButton.className = index === 0 ? "result-pin is-pinned" : "result-pin";
    pinButton.type = "button";
    pinButton.dataset.pinCurrency = code;
    pinButton.setAttribute("aria-label", t("pinCurrency", { currency: code }));
    pinButton.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    pinButton.append(pinIcon());

    const removeButton = document.createElement("button");
    removeButton.className = "result-remove";
    removeButton.type = "button";
    removeButton.dataset.removeCurrency = code;
    removeButton.setAttribute("aria-label", t("removeCurrency", { currency: code }));
    removeButton.append(trashIcon());

    actions.append(pinButton, removeButton);
    item.append(codeElement, valueElement, rateElement, actions);
    fragment.append(item);
  });

  resultList.replaceChildren(fragment);
  updateAddTargetButton();
}

function updateAddTargetButton(): void {
  const count = rates ? workingTargets().length : MAX_TARGET_CURRENCIES;
  addTargetButton.hidden = count >= MAX_TARGET_CURRENCIES;
}

function filterAddableCurrencies(): void {
  const query = addCurrencySearch.value.trim().toLocaleLowerCase(LOCALE_META[locale].intl);
  for (const choice of addCurrencyList.querySelectorAll<HTMLElement>(".add-currency-choice")) {
    const searchable = choice.dataset.searchable ?? "";
    choice.hidden = query !== "" && !searchable.includes(query);
  }
}

function populateAddableCurrencies(): void {
  const selected = new Set(workingTargets());
  const fragment = document.createDocumentFragment();

  for (const code of sortedCurrencyCodes()) {
    if (selected.has(code)) {
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "add-currency-choice";
    button.dataset.currency = code;
    button.dataset.searchable = `${code} ${currencyNames.of(code) ?? ""}`.toLocaleLowerCase(
      LOCALE_META[locale].intl,
    );

    const strong = document.createElement("strong");
    strong.textContent = code;
    const small = document.createElement("small");
    small.textContent = currencyNames.of(code) ?? t("unknownCurrency");
    button.append(strong, small);
    fragment.append(button);
  }

  addCurrencyList.replaceChildren(fragment);
  filterAddableCurrencies();
}

function openAddCurrency(): void {
  if (!rates) {
    syncStatus.textContent = t("settingsNeedRates");
    return;
  }

  addCurrencySearch.value = "";
  populateAddableCurrencies();
  addCurrencyDialog.showModal();
  addCurrencySearch.focus();
}

function validateAmount(showError: boolean): boolean {
  const rawValue = amountInput.value.trim();
  const valid = rawValue === "" || parseAmount(rawValue) !== null;

  amountInput.toggleAttribute("aria-invalid", !valid);
  amountError.textContent = !valid && showError ? t("amountError") : "";
  return valid;
}

function updateClearAmountButton(): void {
  clearAmountButton.disabled = amountInput.value === "";
}

const amountMeasure = document.createElement("span");
amountMeasure.className = "amount-measure";
amountMeasure.setAttribute("aria-hidden", "true");
document.body.append(amountMeasure);

let fittingAmountText = false;

function stripAmountLineBreaks(): void {
  const cleaned = amountInput.value.replaceAll(/[\r\n]/g, "");
  if (cleaned === amountInput.value) {
    return;
  }

  const cursor = amountInput.selectionStart ?? cleaned.length;
  amountInput.value = cleaned;
  const next = Math.min(cursor, cleaned.length);
  amountInput.setSelectionRange(next, next);
}

function fitAmountText(): void {
  if (fittingAmountText) {
    return;
  }

  fittingAmountText = true;
  amountShell.classList.remove("is-wrapping");
  amountShell.dataset.replicatedValue = amountInput.value;
  amountShell.style.fontSize = "";

  const styles = getComputedStyle(amountInput);
  amountMeasure.style.fontFamily = styles.fontFamily;
  amountMeasure.style.fontSize = styles.fontSize;
  amountMeasure.style.fontWeight = styles.fontWeight;
  amountMeasure.style.letterSpacing = styles.letterSpacing;
  const available =
    amountInput.clientWidth
    - Number.parseFloat(styles.paddingInlineStart)
    - Number.parseFloat(styles.paddingInlineEnd);
  const defaultSize = Number.parseFloat(styles.fontSize);
  const minSize = Math.max(11, defaultSize * 0.4);
  const sample = amountInput.value.replaceAll(/\s/g, "") || "0";
  amountMeasure.textContent = sample;
  const textWidth = amountMeasure.getBoundingClientRect().width;

  if (available > 0 && textWidth > available) {
    const next = Math.max(minSize, Math.floor(defaultSize * (available / textWidth)));
    amountShell.style.fontSize = `${next}px`;
    if (next <= minSize) {
      amountMeasure.style.fontSize = `${next}px`;
      if (amountMeasure.getBoundingClientRect().width > available) {
        amountShell.classList.add("is-wrapping");
      }
    }
  }

  fittingAmountText = false;
}

function renderRateStatus(payload: RatesApiResponse): void {
  const sourceDate = new Date(payload.sourceUpdatedAt * 1_000);
  const timeLabel = new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(sourceDate);

  syncSignal.classList.remove("is-loading", "is-warning");
  if (payload.cacheStatus === "stale") {
    syncSignal.classList.add("is-warning");
    syncStatus.textContent = t("staleRates");
    sourceNoteStatus.textContent = t("sourceNoteStale", { time: timeLabel });
  } else if (payload.cacheStatus === "miss") {
    syncStatus.textContent = t("ratesUpdated");
    sourceNoteStatus.textContent = t("sourceNoteReady", { time: timeLabel });
  } else {
    syncStatus.textContent = t("ratesOk");
    sourceNoteStatus.textContent = t("sourceNoteReady", { time: timeLabel });
  }
}

function applyStaticTranslations(): void {
  document.documentElement.lang = LOCALE_META[locale].htmlLang;
  document.title = t("pageTitle");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("pageDescription"));

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = element.dataset.i18n;
    if (isMessageKey(key)) {
      element.textContent = t(key);
    }
  }

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n-placeholder]")) {
    const key = element.dataset.i18nPlaceholder;
    if (isMessageKey(key) && "placeholder" in element) {
      (element as HTMLInputElement).placeholder = t(key);
    }
  }

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]")) {
    const key = element.dataset.i18nAriaLabel;
    if (isMessageKey(key)) {
      element.setAttribute("aria-label", t(key));
    }
  }

  languageFlag.textContent = LOCALE_META[locale].flag;
  updateLanguageMenuSelection();
}

function applyDynamicCopy(): void {
  updateClearAmountButton();
  validateAmount(amountError.textContent !== "");
  fitAmountText();

  if (availableCurrencies.size > 0) {
    populateSelect(inputCurrencySelect, currentInputCurrency);
    populateSelect(defaultInputSelect, preferences.inputCurrency);
    if (settingsDialog.open) {
      populateTargetCurrencies();
      filterTargetCurrencies();
    }
  }

  if (rates) {
    renderResults();
  }

  if (addCurrencyDialog.open) {
    populateAddableCurrencies();
  }

  if (ratesView === "ready" && lastRatesPayload) {
    renderRateStatus(lastRatesPayload);
  } else if (ratesView === "error") {
    syncStatus.textContent = t("syncFailed");
    sourceNoteStatus.textContent = t("sourceNoteError");
  } else {
    syncStatus.textContent = t("syncing");
    sourceNoteStatus.textContent = t("sourceNoteLoading");
  }
}

function setLocale(next: Locale): void {
  locale = next;
  persistLocale(next);
  refreshFormatters();
  applyStaticTranslations();
  applyDynamicCopy();
}

async function loadRates(): Promise<void> {
  ratesView = "loading";
  lastRatesPayload = null;
  syncSignal.classList.add("is-loading");
  syncSignal.classList.remove("is-warning");
  syncStatus.textContent = t("syncing");
  sourceNoteStatus.textContent = t("sourceNoteLoading");
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
    preferences = sanitizePreferences(readRawStorage(), availableCurrencies);
    currentInputCurrency = preferences.inputCurrency;
    lastRatesPayload = payload;
    ratesView = "ready";

    populateSelect(inputCurrencySelect, currentInputCurrency);
    populateSelect(defaultInputSelect, preferences.inputCurrency);
    renderRateStatus(payload);
    renderResults();
  } catch {
    rates = null;
    lastRatesPayload = null;
    ratesView = "error";
    syncSignal.classList.remove("is-loading");
    syncSignal.classList.add("is-warning");
    syncStatus.textContent = t("syncFailed");
    sourceNoteStatus.textContent = t("sourceNoteError");
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

  targetLimitMessage.textContent = announce && atLimit ? t("targetLimit") : "";
}

function filterTargetCurrencies(): void {
  const query = currencySearch.value.trim().toLocaleLowerCase(LOCALE_META[locale].intl);
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
    label.dataset.searchable = `${code} ${currencyNames.of(code) ?? ""}`.toLocaleLowerCase(
      LOCALE_META[locale].intl,
    );

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
    small.textContent = currencyNames.of(code) ?? t("unknownCurrency");
    copy.append(strong, small);

    label.append(checkbox, marker, copy);
    fragment.append(label);
  }

  targetCurrencyList.replaceChildren(fragment);
  updateTargetLimit();
}

function closeLanguageMenu(restoreFocus = false): void {
  languageMenu.hidden = true;
  openLanguageButton.setAttribute("aria-expanded", "false");
  if (restoreFocus) {
    openLanguageButton.focus();
  }
}

function updateLanguageMenuSelection(): void {
  for (const option of languageMenu.querySelectorAll<HTMLButtonElement>("[data-locale]")) {
    option.setAttribute("aria-checked", option.dataset.locale === locale ? "true" : "false");
  }
}

function openLanguageMenu(): void {
  languageMenu.hidden = false;
  openLanguageButton.setAttribute("aria-expanded", "true");
  updateLanguageMenuSelection();
  const selected = languageMenu.querySelector<HTMLButtonElement>(`[data-locale="${locale}"]`);
  selected?.focus();
}

function openSettings(): void {
  if (!rates) {
    syncStatus.textContent = t("settingsNeedRates");
    return;
  }

  closeLanguageMenu();
  populateSelect(defaultInputSelect, preferences.inputCurrency);
  populateTargetCurrencies();
  currencySearch.value = "";
  targetLimitMessage.textContent = "";
  settingsDialog.showModal();
}

function fillLocalePrompt(recommended: Locale): void {
  const promptText = (key: MessageKey) => translate(recommended, key);
  localePromptFlag.textContent = LOCALE_META[recommended].flag;
  localePromptTitle.textContent = promptText("localePromptTitle");
  localePromptCopy.textContent = promptText("localePromptBody");
  localePromptKeep.textContent = promptText("localePromptKeep");
  localePromptSwitch.textContent = promptText("localePromptSwitch");
}

function maybeShowLocalePrompt(): void {
  if (hasExplicitLocale()) {
    return;
  }

  const detected = detectSystemLocale(navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language]);
  if (!detected || detected === DEFAULT_LOCALE) {
    return;
  }

  recommendedLocale = detected;
  fillLocalePrompt(detected);
  if (!localePrompt.open) {
    localePrompt.showModal();
  }
}

function dismissLocalePrompt(nextLocale?: Locale): void {
  if (nextLocale) {
    setLocale(nextLocale);
  } else if (!hasExplicitLocale()) {
    persistLocale(locale);
  }
  recommendedLocale = null;
  if (localePrompt.open) {
    localePrompt.close();
  }
}

amountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  validateAmount(true);
  amountInput.blur();
});

amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    amountForm.requestSubmit();
  }
});

amountInput.addEventListener("input", () => {
  stripAmountLineBreaks();
  validateAmount(false);
  updateClearAmountButton();
  fitAmountText();
  renderResults();
});
amountInput.addEventListener("blur", () => validateAmount(true));

clearAmountButton.addEventListener("click", () => {
  amountInput.value = "";
  validateAmount(false);
  updateClearAmountButton();
  fitAmountText();
  renderResults();
  amountInput.focus();
});

inputCurrencySelect.addEventListener("change", () => {
  persistInputCurrency(inputCurrencySelect.value);
  renderResults();
});

retryRatesButton.addEventListener("click", loadRates);
addTargetButton.addEventListener("click", openAddCurrency);
closeAddCurrencyButton.addEventListener("click", () => addCurrencyDialog.close());
addCurrencySearch.addEventListener("input", filterAddableCurrencies);
addCurrencyList.addEventListener("click", (event) => {
  const choice = event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>("[data-currency]")
    : null;
  if (!choice?.dataset.currency) {
    return;
  }

  addTarget(choice.dataset.currency);
  addCurrencyDialog.close();
});
addCurrencyDialog.addEventListener("click", (event) => {
  if (event.target === addCurrencyDialog) {
    addCurrencyDialog.close();
  }
});
resultList.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const removeButton = target?.closest<HTMLButtonElement>("[data-remove-currency]");
  if (removeButton?.dataset.removeCurrency) {
    removeTarget(removeButton.dataset.removeCurrency);
    return;
  }

  const pinButton = target?.closest<HTMLButtonElement>("[data-pin-currency]");
  if (pinButton?.dataset.pinCurrency) {
    pinTarget(pinButton.dataset.pinCurrency);
  }
});
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
    targetCurrencies: mergeTargetSelection(
      workingTargets(),
      selectedTargetInputs().map((input) => input.value),
    ),
  };
  preferences = sanitizePreferences(nextPreferences, availableCurrencies);
  currentInputCurrency = preferences.inputCurrency;
  writePreferences(preferences);
  populateSelect(inputCurrencySelect, currentInputCurrency);
  renderResults();
  settingsDialog.close();
  syncStatus.textContent = t("settingsSaved");
});

resetSettingsButton.addEventListener("click", () => {
  preferences = { ...DEFAULT_PREFERENCES };
  currentInputCurrency = preferences.inputCurrency;
  writePreferences(preferences);
  populateSelect(inputCurrencySelect, currentInputCurrency);
  renderResults();
  settingsDialog.close();
  syncStatus.textContent = t("settingsReset");
});

settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    settingsDialog.close();
  }
});

openLanguageButton.addEventListener("click", () => {
  if (languageMenu.hidden) {
    openLanguageMenu();
  } else {
    closeLanguageMenu();
  }
});

languageMenu.addEventListener("click", (event) => {
  const option = event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>("[data-locale]")
    : null;
  if (!option || !isLocale(option.dataset.locale)) {
    return;
  }

  setLocale(option.dataset.locale);
  closeLanguageMenu(true);
});

document.addEventListener("click", (event) => {
  if (
    !languageMenu.hidden &&
    event.target instanceof Node &&
    !languageSwitcher.contains(event.target)
  ) {
    closeLanguageMenu();
  }
});

languageSwitcher.addEventListener("focusout", (event) => {
  const next = event.relatedTarget;
  if (next instanceof Node && languageSwitcher.contains(next)) {
    return;
  }
  closeLanguageMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !languageMenu.hidden) {
    event.stopPropagation();
    closeLanguageMenu(true);
  }
});

localePromptKeep.addEventListener("click", () => dismissLocalePrompt());
localePromptSwitch.addEventListener("click", () => {
  if (recommendedLocale) {
    dismissLocalePrompt(recommendedLocale);
  }
});
localePrompt.addEventListener("click", (event) => {
  if (event.target === localePrompt) {
    dismissLocalePrompt();
  }
});
localePrompt.addEventListener("close", () => {
  if (!hasExplicitLocale()) {
    persistLocale(locale);
  }
});

new ResizeObserver(() => fitAmountText()).observe(amountControl);
if (document.fonts?.ready) {
  void document.fonts.ready.then(() => fitAmountText());
}

locale = readStoredLocale(readRawStorage()) ?? DEFAULT_LOCALE;
refreshFormatters();
applyStaticTranslations();
updateClearAmountButton();
fitAmountText();
maybeShowLocalePrompt();
void loadRates();
