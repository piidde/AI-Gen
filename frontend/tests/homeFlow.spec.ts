import { expect, test } from '@playwright/test';

test('workflow signal travels toward its destination without returning to the start', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  if (page.viewportSize()!.width <= 650) {
    await expect(page.locator('.flow-connections')).toBeHidden();
    return;
  }

  const samples = await page.locator('.flow-signal-image').evaluate(element => {
    const animation = element.getAnimations()[0];
    animation.pause();
    return [800, 2400, 3200, 3600].map(time => {
      animation.currentTime = time;
      const style = getComputedStyle(element);
      return {
        offset: Number.parseFloat(style.strokeDashoffset),
        opacity: Number.parseFloat(style.opacity),
        dashPeriod: style.strokeDasharray.split(/[\s,]+/).reduce((sum, value) => sum + Number.parseFloat(value), 0),
      };
    });
  });

  expect(samples[0].offset).toBeLessThan(5);
  expect(samples[1].offset).toBeLessThan(samples[0].offset);
  expect(samples[2].offset).toBeLessThan(samples[1].offset);
  expect(samples[2].offset).toBeLessThanOrEqual(-100);
  expect(samples[2].dashPeriod).toBeGreaterThan(Math.abs(samples[2].offset));
  expect(samples[3].opacity).toBe(0);
});
