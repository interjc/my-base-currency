import { expect, test } from "@playwright/test";

const ratePayload = {
  baseCode: "USD",
  rates: {
    USD: 1,
    CNY: 7,
    JPY: 150,
    EUR: 0.9,
    GBP: 0.8,
    AUD: 1.5,
    CAD: 1.35,
  },
  sourceUpdatedAt: 1_800_000_000,
  sourceNextUpdateAt: 1_800_003_600,
  cachedAt: 1_800_000_000_000,
  cacheStatus: "hit",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/rates", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ratePayload),
    });
  });
  await page.goto("/");
});

test("puts rate freshness into the footer and hides the currency hint", async ({ page }) => {
  await expect(page.getByText("选择后会记住，下次打开仍使用这个币种。")).toHaveCount(0);
  await expect(page.locator(".sync-strip")).toHaveCount(0);
  await expect(page.locator(".source-note")).toContainText("ExchangeRate-API");
  await expect(page.locator(".source-note")).toContainText("更新于");
});

test("converts USD into the default CNY home currency", async ({ page }) => {
  const amountInput = page.getByLabel("金额", { exact: true });
  await expect(amountInput).toHaveValue("100");
  await expect(page.locator('[data-currency="CNY"] [data-result-value]')).toHaveAttribute(
    "data-raw-value",
    "700",
  );

  await amountInput.fill("10");

  const result = page.locator('[data-currency="CNY"] [data-result-value]');
  await expect(result).toHaveAttribute("data-raw-value", "70");
  await expect(page.getByText("1 USD ≈ 7 CNY")).toBeVisible();

  await page.getByRole("button", { name: "清空金额" }).click();
  await expect(amountInput).toHaveValue("");
  await expect(result).toHaveText("—");
  await expect(page.getByRole("button", { name: "清空金额" })).toBeDisabled();
});

test("shrinks or wraps a long amount so it stays inside the field", async ({ page }) => {
  const amountInput = page.getByLabel("金额", { exact: true });
  await amountInput.fill("123456789012345678901234");

  const overflow = await page.evaluate(() => {
    const field = document.querySelector("#amount");
    const control = document.querySelector(".amount-control");
    if (!(field instanceof HTMLElement) || !(control instanceof HTMLElement)) {
      return true;
    }
    return (
      field.scrollWidth > field.clientWidth + 2
      || control.scrollWidth > control.clientWidth + 2
    );
  });
  expect(overflow).toBe(false);
  await expect(page.locator('[data-currency="CNY"] [data-result-value]')).not.toHaveText("—");
});

test("persists the input currency chosen on the calculator", async ({ page }) => {
  await page.locator("#input-currency").selectOption("JPY");
  await expect(page.getByText("1 JPY ≈")).toBeVisible();

  await page.reload();
  await expect(page.locator("#input-currency")).toHaveValue("JPY");
  await expect(page.getByText("1 JPY ≈")).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem("base-money.preferences.v1"));
  expect(stored).toContain('"inputCurrency":"JPY"');
});

test("adds and removes home currencies from the result list", async ({ page }) => {
  await expect(page.locator(".formula-note")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "添加本位币" })).toBeVisible();

  await page.getByRole("button", { name: "添加本位币" }).click();
  await page.locator('.add-currency-choice[data-currency="JPY"]').click();
  await expect(page.locator('#result-list [data-currency="JPY"]')).toBeVisible();
  await expect(page.locator('#result-list [data-currency="CNY"]')).toBeVisible();

  const yenCard = page.locator('#result-list [data-currency="JPY"]');
  await yenCard.hover();
  await yenCard.getByRole("button", { name: "删除 JPY" }).click();
  await expect(page.locator('#result-list [data-currency="JPY"]')).toHaveCount(0);
  await expect(page.locator('#result-list [data-currency="CNY"]')).toBeVisible();

  await page.reload();
  await expect(page.locator('#result-list [data-currency="CNY"]')).toBeVisible();
  await expect(page.locator('#result-list [data-currency="JPY"]')).toHaveCount(0);

  const stored = await page.evaluate(() => localStorage.getItem("base-money.preferences.v1"));
  expect(stored).toContain("CNY");
  expect(stored).not.toContain("JPY");
});

test("pins a home currency to the top and remembers the order", async ({ page }) => {
  await page.getByRole("button", { name: "添加本位币" }).click();
  await page.locator('.add-currency-choice[data-currency="JPY"]').click();
  await expect(page.locator("#result-list li").first()).toHaveAttribute("data-currency", "CNY");

  const yenCard = page.locator('#result-list [data-currency="JPY"]');
  await yenCard.hover();
  await yenCard.getByRole("button", { name: "置顶 JPY" }).click();
  await expect(page.locator("#result-list li").first()).toHaveAttribute("data-currency", "JPY");

  await page.reload();
  await expect(page.locator("#result-list li").first()).toHaveAttribute("data-currency", "JPY");
  await expect(page.locator("#result-list li").nth(1)).toHaveAttribute("data-currency", "CNY");

  const stored = await page.evaluate(() => localStorage.getItem("base-money.preferences.v1"));
  expect(stored).toMatch(/"targetCurrencies":\["JPY","CNY"\]/);
});

test("hides the add control once five home currencies are selected", async ({ page }) => {
  await page.getByRole("button", { name: "设置" }).click();
  for (const code of ["CNY", "JPY", "EUR", "GBP", "AUD"]) {
    await page.locator(`.currency-choice[data-currency="${code}"] input`).check();
  }
  await page.getByRole("button", { name: "保存设置" }).click();
  await expect(page.getByRole("button", { name: "添加本位币" })).toBeHidden();
});

test("saves a default input and multiple target currencies", async ({ page }) => {
  await page.getByRole("button", { name: "设置" }).click();
  await expect(page.getByRole("button", { name: "保存设置" })).toBeInViewport();
  await page.getByLabel("默认输入币种").selectOption("EUR");

  await page.locator('.currency-choice[data-currency="JPY"] input').check();
  await page.locator('.currency-choice[data-currency="GBP"] input').check();
  await page.getByRole("button", { name: "保存设置" }).click();

  await expect(page.getByLabel("这次使用的币种")).toHaveValue("EUR");
  await page.getByLabel("金额", { exact: true }).fill("9");
  await expect(page.locator('[data-currency="JPY"] [data-result-value]')).toHaveAttribute(
    "data-raw-value",
    "1500",
  );
  await expect(page.locator('#result-list [data-currency="GBP"]')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("这次使用的币种")).toHaveValue("EUR");
  await expect(page.locator('[data-currency="JPY"]')).toBeVisible();
});

test("enforces five target slots and avoids horizontal overflow", async ({ page }) => {
  await page.getByRole("button", { name: "设置" }).click();

  for (const code of ["CNY", "JPY", "EUR", "GBP", "AUD"]) {
    await page.locator(`.currency-choice[data-currency="${code}"] input`).check();
  }

  await expect(page.locator('.currency-choice[data-currency="CAD"] input')).toBeDisabled();
  await expect(page.getByText(/已选择 5 个本位币/)).toBeVisible();
  await page.getByRole("button", { name: "取消" }).click();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("keeps only the Chinese slogan and hides English intro copy", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("看心里有数的价格");
  await expect(page.locator(".intro-copy")).toHaveCount(0);
  await expect(page.locator(".intro .eyebrow")).toHaveCount(0);
  await expect(page.getByText("PERSONAL CURRENCY CONVERTER")).toHaveCount(0);
});

test("switches language from the header control and persists it with currency preferences", async ({
  page,
}) => {
  await page.getByRole("button", { name: "语言" }).click();
  await page.getByRole("menuitemradio", { name: "English" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know the price in your head");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("PERSONAL CURRENCY CONVERTER")).toHaveCount(0);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Default input currency").selectOption("EUR");
  await page.locator('.currency-choice[data-currency="JPY"] input').check();
  await page.getByRole("button", { name: "Save settings" }).click();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know the price in your head");
  await expect(page.locator("#input-currency")).toHaveValue("EUR");
  await expect(page.locator('[data-currency="JPY"]')).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem("base-money.preferences.v1"));
  expect(stored).toContain('"locale":"en"');
  expect(stored).toContain('"inputCurrency":"EUR"');
  expect(stored).toContain("JPY");
});

test("can switch to Traditional Chinese and Japanese", async ({ page }) => {
  await page.getByRole("button", { name: "语言" }).click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("看心裡有數的價格");
  await expect(page.getByRole("button", { name: "設定" })).toBeVisible();

  await page.getByRole("button", { name: "語言" }).click();
  await page.getByRole("menuitemradio", { name: "日本語" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("心でわかる値段");
  await expect(page.getByRole("button", { name: "設定" })).toBeVisible();
});

test.describe("language recommendation", () => {
  test.use({ locale: "en-US" });

  test("recommends the system language without auto-switching", async ({ page }) => {
    await expect(page.getByRole("dialog", { name: "Use English?" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("看心里有数的价格");

    await page.getByRole("button", { name: "Use English" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know the price in your head");

    await page.reload();
    await expect(page.getByRole("dialog", { name: "Use English?" })).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know the price in your head");
  });

  test("keeps Simplified Chinese when the recommendation is dismissed", async ({ page }) => {
    await expect(page.getByRole("dialog", { name: "Use English?" })).toBeVisible();
    await page.getByRole("button", { name: "Keep 简体中文" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("看心里有数的价格");

    await page.reload();
    await expect(page.getByRole("dialog", { name: "Use English?" })).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("看心里有数的价格");
  });
});

test("keeps the input and five home-currency results in the first mobile viewport", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));

  await page.getByRole("button", { name: "设置" }).click();
  for (const code of ["CNY", "JPY", "EUR", "GBP", "AUD"]) {
    await page.locator(`.currency-choice[data-currency="${code}"] input`).check();
  }
  await page.getByRole("button", { name: "保存设置" }).click();

  await expect(page.getByLabel("金额", { exact: true })).toBeInViewport();
  await expect(page.locator('#result-list [data-currency="AUD"]')).toBeInViewport();

  const fitsFirstViewport = await page.evaluate(() => {
    const amount = document.querySelector("#amount")?.getBoundingClientRect();
    const inputBar = document.querySelector("#amount-form")?.getBoundingClientRect();
    const lastResult = document
      .querySelector('#result-list [data-currency="AUD"]')
      ?.getBoundingClientRect();
    return Boolean(
      amount &&
      inputBar &&
      lastResult &&
      amount.top >= 0 &&
      lastResult.bottom <= inputBar.top
    );
  });
  expect(fitsFirstViewport).toBe(true);
});
