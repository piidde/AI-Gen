import { expect, test } from "@playwright/test";

test("availability keeps overview card footer geometry stable", async ({ page }) => {
  for (const width of [2560, 1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/models?capability=Image");
    await expect(page.locator(".catalogue-collection .reference-card").first()).toBeVisible();
    const geometry = await page.locator(".catalogue-collection .reference-card").evaluateAll(nodes => nodes.slice(0, 3).map(card => {
      const footer = card.querySelector("footer")!;
      const slot = footer.querySelector(".catalogue-status-slot");
      const label = footer.querySelector(".availability-label");
      return {
        cardTop: card.getBoundingClientRect().top,
        footerTop: footer.getBoundingClientRect().top,
        footerLeft: footer.getBoundingClientRect().left,
        footerHeight: footer.getBoundingClientRect().height,
        buttonLeft: footer.querySelector("button")!.getBoundingClientRect().left,
        slotHeight: slot?.getBoundingClientRect().height ?? 0,
        labelSize: label ? parseFloat(getComputedStyle(label).fontSize) : null,
      };
    }));
    expect(geometry).toHaveLength(3);
    expect(geometry.map(item => item.labelSize === null)).toEqual([true, false, false]);
    expect(geometry.every(item => item.slotHeight >= 36)).toBe(true);
    expect(geometry.every(item => Math.abs(item.buttonLeft - item.footerLeft) < 1)).toBe(true);
    expect(Math.max(...geometry.map(item => item.footerHeight)) - Math.min(...geometry.map(item => item.footerHeight))).toBeLessThan(1);
    expect(geometry.filter(item => item.labelSize !== null).every(item => item.labelSize! >= 12)).toBe(true);
    if (width > 390) {
      expect(Math.max(...geometry.map(item => item.cardTop)) - Math.min(...geometry.map(item => item.cardTop))).toBeLessThan(1);
      expect(Math.max(...geometry.map(item => item.footerTop)) - Math.min(...geometry.map(item => item.footerTop))).toBeLessThan(1);
    }
    await page.goto("/models?capability=Text");
    await expect(page.locator(".catalogue-collection.catalogue-has-status")).toHaveCount(0);
    expect(await page.locator(".catalogue-collection .reference-card footer").first().evaluate(node => getComputedStyle(node).display)).toBe("flex");
  }
});
