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
