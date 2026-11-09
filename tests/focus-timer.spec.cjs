const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.clock.install();
  await page.goto('/');
});

test('custom duration completes after a delayed callback and can restart', async ({ page }) => {
  const duration = page.getByRole('spinbutton', { name: 'Focus minutes' });
  await duration.fill('1');
  await duration.press('Tab');
  await expect(page.getByRole('timer')).toHaveText('01:00');
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await expect(duration).toBeDisabled();
  await page.clock.fastForward(90000);
  await expect(page.getByRole('timer')).toHaveText('00:00');
  await expect(page.locator('#focus-status')).toHaveText('Focus complete! Take a well-earned break.');
  await expect(duration).toBeEnabled();
  await page.clock.fastForward(120000);
  await expect(page.getByRole('timer')).toHaveText('00:00');
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('01:00');
  await page.getByRole('button', { name: 'Reset timer', exact: true }).click();
  await expect(duration).toBeEnabled();
  await expect(page.getByRole('timer')).toHaveText('01:00');
});

test('invalid durations do not start the countdown', async ({ page }) => {
  const duration = page.getByRole('spinbutton', { name: 'Focus minutes' });
  for (const value of ['', '0', '121', '1.5', '-2']) {
    await duration.fill(value);
    await page.getByRole('button', { name: 'Start focus', exact: true }).click();
    await expect(duration).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Start focus', exact: true })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText('25:00');
  }
  await duration.fill('120');
  await duration.press('Tab');
  await expect(page.getByRole('timer')).toHaveText('120:00');
});
