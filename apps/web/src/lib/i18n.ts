export const PREFERENCES_STORAGE_KEY = "base-money.preferences.v1";

export const LOCALES = ["zh-CN", "zh-HK", "ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh-CN";

export interface LocaleMeta {
  flag: string;
  nativeName: string;
  htmlLang: string;
  intl: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  "zh-CN": {
    flag: "🇨🇳",
    nativeName: "简体中文",
    htmlLang: "zh-CN",
    intl: "zh-CN",
  },
  "zh-HK": {
    flag: "🇭🇰",
    nativeName: "繁體中文",
    htmlLang: "zh-HK",
    intl: "zh-HK",
  },
  ja: {
    flag: "🇯🇵",
    nativeName: "日本語",
    htmlLang: "ja",
    intl: "ja-JP",
  },
  en: {
    flag: "🇺🇸",
    nativeName: "English",
    htmlLang: "en",
    intl: "en-US",
  },
};

const zhCN = {
  skipToCalculator: "跳到换算器",
  brandHome: "Base Money 首页",
  brandTagline: "你的本位币换算器",
  settings: "设置",
  language: "语言",
  languageMenu: "选择语言",
  slogan: "看心里有数的价格",
  pageTitle: "Base Money｜看心里有数的价格",
  pageDescription:
    "Base Money 是一个即时多币种换算器，保存你的默认输入币种和最多五个本位币。",
  calculatorLabel: "汇率换算器",
  amountKicker: "AMOUNT TO CONVERT",
  amountHeading: "现实价格",
  amountLegend: "输入待换算的金额和币种",
  amountLabel: "金额",
  amountHint: "可使用小数点或小数逗号，不需要输入货币符号。",
  clearAmount: "清空",
  clearAmountAria: "清空金额",
  inputCurrencyWide: "这次使用的币种",
  inputCurrencyMobile: "输入币种",
  syncing: "正在同步汇率…",
  ratesError: "暂时无法获取汇率。金额会保留，你可以稍后重试。",
  retrySync: "重新同步",
  resultsKicker: "YOUR BASE CURRENCIES",
  resultsHeading: "本位价格",
  waitingRates: "等待汇率同步",
  addCurrency: "添加",
  addCurrencyAria: "添加本位币",
  addCurrencyTitle: "添加本位币",
  removeCurrency: "删除 {currency}",
  pinCurrency: "置顶 {currency}",
  closeAddCurrency: "关闭",
  sourceNoteBefore: "汇率由 ",
  sourceNoteLoading: " 提供 · 正在同步…",
  sourceNoteReady: " 提供 · 更新于 {time} · 仅供估算",
  sourceNoteStale: " 提供 · 缓存于 {time} · 仅供估算",
  sourceNoteError: " 提供 · 暂时无法更新 · 仅供估算",
  settingsKicker: "CURRENCY PREFERENCES",
  settingsTitle: "默认币种设置",
  closeSettings: "关闭设置",
  defaultInput: "默认输入币种",
  homeCurrencies: "本位币",
  searchCurrencies: "搜索币种",
  searchPlaceholder: "例如 JPY 或 日元",
  targetHint: "最多选择 5 个；一个都不选时仍会显示 CNY。",
  reset: "恢复默认",
  cancel: "取消",
  saveSettings: "保存设置",
  storageFailed: "设置已应用，但浏览器没有保存它",
  unknownCurrency: "未知币种",
  rateUnavailable: "汇率不可用",
  amountError: "请输入一个非负金额，例如 64 或 64.5。",
  staleRates: "上游暂时离线，正在使用缓存行情",
  ratesUpdated: "汇率已更新",
  ratesOk: "汇率数据正常",
  syncFailed: "汇率同步失败",
  retryHint: "检查网络后可以重新尝试",
  targetLimit: "已选择 5 个本位币；取消一个后才能继续选择。",
  settingsNeedRates: "汇率加载完成后才能选择币种",
  settingsSaved: "默认币种设置已保存",
  settingsReset: "已恢复 USD → CNY 默认设置",
  localePromptTitle: "切换到简体中文？",
  localePromptBody: "检测到你的系统语言是简体中文。要切换到该语言吗？",
  localePromptSwitch: "切换到简体中文",
  localePromptKeep: "保持当前语言",
} as const;

export type MessageKey = keyof typeof zhCN;

const zhHK: Record<MessageKey, string> = {
  skipToCalculator: "跳到換算器",
  brandHome: "Base Money 首頁",
  brandTagline: "你的本位貨幣換算器",
  settings: "設定",
  language: "語言",
  languageMenu: "選擇語言",
  slogan: "看心裡有數的價格",
  pageTitle: "Base Money｜看心裡有數的價格",
  pageDescription:
    "Base Money 是即時多幣種換算器，可保存預設輸入幣種和最多五個本位貨幣。",
  calculatorLabel: "匯率換算器",
  amountKicker: "AMOUNT TO CONVERT",
  amountHeading: "現實價格",
  amountLegend: "輸入待換算的金額和幣種",
  amountLabel: "金額",
  amountHint: "可使用小數點或小數逗號，不需要輸入貨幣符號。",
  clearAmount: "清空",
  clearAmountAria: "清空金額",
  inputCurrencyWide: "這次使用的幣種",
  inputCurrencyMobile: "輸入幣種",
  syncing: "正在同步匯率…",
  ratesError: "暫時無法取得匯率。金額會保留，你可以稍後重試。",
  retrySync: "重新同步",
  resultsKicker: "YOUR BASE CURRENCIES",
  resultsHeading: "本位價格",
  waitingRates: "等待匯率同步",
  addCurrency: "新增",
  addCurrencyAria: "新增本位貨幣",
  addCurrencyTitle: "新增本位貨幣",
  removeCurrency: "刪除 {currency}",
  pinCurrency: "置頂 {currency}",
  closeAddCurrency: "關閉",
  sourceNoteBefore: "匯率由 ",
  sourceNoteLoading: " 提供 · 正在同步…",
  sourceNoteReady: " 提供 · 更新於 {time} · 僅供估算",
  sourceNoteStale: " 提供 · 快取於 {time} · 僅供估算",
  sourceNoteError: " 提供 · 暫時無法更新 · 僅供估算",
  settingsKicker: "CURRENCY PREFERENCES",
  settingsTitle: "預設幣種設定",
  closeSettings: "關閉設定",
  defaultInput: "預設輸入幣種",
  homeCurrencies: "本位貨幣",
  searchCurrencies: "搜尋幣種",
  searchPlaceholder: "例如 JPY 或 日圓",
  targetHint: "最多選擇 5 個；一個都不選時仍會顯示 CNY。",
  reset: "恢復預設",
  cancel: "取消",
  saveSettings: "儲存設定",
  storageFailed: "設定已套用，但瀏覽器沒有保存它",
  unknownCurrency: "未知幣種",
  rateUnavailable: "匯率不可用",
  amountError: "請輸入一個非負金額，例如 64 或 64.5。",
  staleRates: "上游暫時離線，正在使用快取行情",
  ratesUpdated: "匯率已更新",
  ratesOk: "匯率數據正常",
  syncFailed: "匯率同步失敗",
  retryHint: "檢查網絡後可以重新嘗試",
  targetLimit: "已選擇 5 個本位貨幣；取消一個後才能繼續選擇。",
  settingsNeedRates: "匯率載入完成後才能選擇幣種",
  settingsSaved: "預設幣種設定已保存",
  settingsReset: "已恢復 USD → CNY 預設設定",
  localePromptTitle: "切換至繁體中文？",
  localePromptBody: "偵測到你的系統語言是繁體中文。要切換到該語言嗎？",
  localePromptSwitch: "切換至繁體中文",
  localePromptKeep: "繼續使用簡體中文",
};

const ja: Record<MessageKey, string> = {
  skipToCalculator: "換算ツールへ",
  brandHome: "Base Money ホーム",
  brandTagline: "あなたの基軸通貨コンバーター",
  settings: "設定",
  language: "言語",
  languageMenu: "言語を選ぶ",
  slogan: "心でわかる値段",
  pageTitle: "Base Money｜心でわかる値段",
  pageDescription:
    "Base Money は、既定の入力通貨と最大5つの基軸通貨をこの端末に保存する多通貨コンバーターです。",
  calculatorLabel: "為替コンバーター",
  amountKicker: "AMOUNT TO CONVERT",
  amountHeading: "現実価格",
  amountLegend: "換算する金額と通貨を入力",
  amountLabel: "金額",
  amountHint: "小数点またはコンマが使えます。通貨記号は不要です。",
  clearAmount: "消去",
  clearAmountAria: "金額を消去",
  inputCurrencyWide: "今回の通貨",
  inputCurrencyMobile: "入力通貨",
  syncing: "為替レートを同期中…",
  ratesError: "為替レートを取得できません。金額は残ります。あとで再試行できます。",
  retrySync: "再同期",
  resultsKicker: "YOUR BASE CURRENCIES",
  resultsHeading: "基軸価格",
  waitingRates: "レート待機中",
  addCurrency: "追加",
  addCurrencyAria: "基軸通貨を追加",
  addCurrencyTitle: "基軸通貨を追加",
  removeCurrency: "{currency} を削除",
  pinCurrency: "{currency} を先頭に",
  closeAddCurrency: "閉じる",
  sourceNoteBefore: "為替レート提供：",
  sourceNoteLoading: " 同期中…",
  sourceNoteReady: " 更新 {time} · 目安です",
  sourceNoteStale: " キャッシュ {time} · 目安です",
  sourceNoteError: " 一時的に更新できません · 目安です",
  settingsKicker: "CURRENCY PREFERENCES",
  settingsTitle: "既定の通貨",
  closeSettings: "設定を閉じる",
  defaultInput: "既定の入力通貨",
  homeCurrencies: "基軸通貨",
  searchCurrencies: "通貨を検索",
  searchPlaceholder: "例：JPY または 円",
  targetHint: "最大5つまで。未選択のときは CNY を表示します。",
  reset: "既定に戻す",
  cancel: "キャンセル",
  saveSettings: "設定を保存",
  storageFailed: "設定は反映されましたが、ブラウザに保存できませんでした",
  unknownCurrency: "不明な通貨",
  rateUnavailable: "レートなし",
  amountError: "0以上の金額を入力してください。例：64 または 64.5",
  staleRates: "上流がオフラインのため、キャッシュを使用中",
  ratesUpdated: "レートを更新しました",
  ratesOk: "レートは正常です",
  syncFailed: "レート同期に失敗しました",
  retryHint: "接続を確認して再試行できます",
  targetLimit: "基軸通貨を5つ選択済みです。別の通貨を選ぶには、1つ解除してください。",
  settingsNeedRates: "レート読み込み後に通貨を選べます",
  settingsSaved: "既定の通貨を保存しました",
  settingsReset: "USD → CNY の既定に戻しました",
  localePromptTitle: "日本語に切り替えますか？",
  localePromptBody: "端末の言語は日本語のようです。このコンバーターを日本語にしますか？",
  localePromptSwitch: "日本語にする",
  localePromptKeep: "簡体字中国語のまま",
};

const en: Record<MessageKey, string> = {
  skipToCalculator: "Skip to converter",
  brandHome: "Base Money home",
  brandTagline: "Your home-currency converter",
  settings: "Settings",
  language: "Language",
  languageMenu: "Choose language",
  slogan: "Know the price in your head",
  pageTitle: "Base Money | Know the price in your head",
  pageDescription:
    "Base Money is an instant multi-currency converter that keeps your default input currency and up to five home currencies on this device.",
  calculatorLabel: "Currency converter",
  amountKicker: "AMOUNT TO CONVERT",
  amountHeading: "Real price",
  amountLegend: "Enter the amount and currency to convert",
  amountLabel: "Amount",
  amountHint: "Decimals with a point or comma are fine. No currency symbol needed.",
  clearAmount: "Clear",
  clearAmountAria: "Clear amount",
  inputCurrencyWide: "Currency for this amount",
  inputCurrencyMobile: "Input currency",
  syncing: "Syncing exchange rates…",
  ratesError:
    "Rates are unavailable right now. Your amount is kept, and you can try again.",
  retrySync: "Sync again",
  resultsKicker: "YOUR BASE CURRENCIES",
  resultsHeading: "Base price",
  waitingRates: "Waiting for rates",
  addCurrency: "Add",
  addCurrencyAria: "Add a home currency",
  addCurrencyTitle: "Add a home currency",
  removeCurrency: "Remove {currency}",
  pinCurrency: "Pin {currency} to top",
  closeAddCurrency: "Close",
  sourceNoteBefore: "Rates from ",
  sourceNoteLoading: " · syncing…",
  sourceNoteReady: " · updated {time} · estimates only",
  sourceNoteStale: " · cached {time} · estimates only",
  sourceNoteError: " · temporarily unavailable · estimates only",
  settingsKicker: "CURRENCY PREFERENCES",
  settingsTitle: "Default currencies",
  closeSettings: "Close settings",
  defaultInput: "Default input currency",
  homeCurrencies: "Home currencies",
  searchCurrencies: "Search currencies",
  searchPlaceholder: "e.g. JPY or yen",
  targetHint: "Pick up to 5. If you pick none, CNY is still shown.",
  reset: "Restore defaults",
  cancel: "Cancel",
  saveSettings: "Save settings",
  storageFailed: "Settings applied, but the browser could not save them",
  unknownCurrency: "Unknown currency",
  rateUnavailable: "Rate unavailable",
  amountError: "Enter a non-negative amount, such as 64 or 64.5.",
  staleRates: "Upstream is offline; using cached rates",
  ratesUpdated: "Rates updated",
  ratesOk: "Rates look good",
  syncFailed: "Could not sync rates",
  retryHint: "Check your connection and try again",
  targetLimit: "5 home currencies selected. Uncheck one to pick another.",
  settingsNeedRates: "Wait for rates to load before choosing currencies",
  settingsSaved: "Default currencies saved",
  settingsReset: "Restored USD → CNY defaults",
  localePromptTitle: "Use English?",
  localePromptBody: "Your device language looks like English. Switch this converter to English?",
  localePromptSwitch: "Use English",
  localePromptKeep: "Keep 简体中文",
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  "zh-CN": zhCN,
  "zh-HK": zhHK,
  ja,
  en,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: unknown): Locale | null {
  return isLocale(value) ? value : null;
}

export function sanitizeLocale(value: unknown): Locale {
  return parseLocale(value) ?? DEFAULT_LOCALE;
}

export function detectSystemLocale(languages: readonly string[]): Locale | null {
  for (const language of languages) {
    const normalized = language.trim().replaceAll("_", "-").toLowerCase();
    if (!normalized) {
      continue;
    }

    const parts = normalized.split("-");
    const primary = parts[0];

    if (primary === "zh") {
      if (parts.includes("hans")) {
        return "zh-CN";
      }
      if (
        parts.includes("hant") ||
        parts.includes("hk") ||
        parts.includes("tw") ||
        parts.includes("mo")
      ) {
        return "zh-HK";
      }
      return "zh-CN";
    }

    if (primary === "ja") {
      return "ja";
    }

    if (primary === "en") {
      return "en";
    }
  }

  return null;
}

export function isMessageKey(value: unknown): value is MessageKey {
  return typeof value === "string" && value in zhCN;
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars: Record<string, string> = {},
): string {
  let text = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key];
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}

export function readStoredLocale(raw: unknown): Locale | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return parseLocale(raw);
  }

  return parseLocale((raw as { locale?: unknown }).locale);
}
