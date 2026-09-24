import { expect, test } from "@playwright/test";

test("catalogue filter supports keyboard selection and URL history", async ({ page }) => {
  await page.goto("/models");
  const provider = page.getByRole("combobox", { name: "Filter provider" });
  await provider.focus();
  await page.keyboard.press("ArrowDown");
  await expect(provider).toHaveAttribute("aria-expanded", "true");
  const listbox = page.getByRole("listbox", { name: "Filter provider" });
  await expect(listbox.getByRole("option", { name: "OpenAI" })).toHaveAttribute("id", await provider.getAttribute("aria-activedescendant") ?? "");
  await page.keyboard.press("Enter");
  await expect(provider).toHaveText(/OpenAI/);
  await expect(provider).toBeFocused();
  await expect(page).toHaveURL(/provider=OpenAI/);

  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowUp");
  await expect(provider).toHaveAttribute("aria-activedescendant", /option-2$/);
  await page.keyboard.press("Escape");

  const capability = page.getByRole("combobox", { name: "Filter capability" });
  await capability.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/capability=Image/);
  await page.goBack();
  await expect(capability).toHaveText(/All capabilities/);
  await expect(provider).toHaveText(/OpenAI/);
});

test("catalogue filter dismisses cleanly and supports typeahead", async ({ page }) => {
  await page.goto("/models");
  const provider = page.getByRole("combobox", { name: "Filter provider" });
  await provider.focus();
  await page.keyboard.press("g");
  await expect(provider).toHaveText(/Google/);
  await expect(page).toHaveURL(/provider=Google/);

  await page.keyboard.press("Space");
  await expect(provider).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(provider).toHaveAttribute("aria-expanded", "false");
  await expect(provider).toBeFocused();

  await page.keyboard.press("Space");
  await page.getByRole("searchbox", { name: "Search models" }).click();
  await expect(provider).toHaveAttribute("aria-expanded", "false");
  await provider.click();
  await page.keyboard.press("Tab");
  await expect(provider).toHaveAttribute("aria-expanded", "false");
});

test("catalogue filter menu remains inside the mobile viewport", async ({ page }) => {
  await page.goto("/models");
  const provider = page.getByRole("combobox", { name: "Filter provider" });
  await provider.click();
  const bounds = await page.getByRole("listbox", { name: "Filter provider" }).boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height + 1);
});
