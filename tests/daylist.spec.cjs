const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('/');
});

test('focus timer starts, pauses, resumes and resets a 25-minute session', async ({ page }) => {
  await page.clock.install();
  const display = page.getByRole('timer');
  await expect(display).toHaveText('25:00');
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await page.clock.fastForward(61000);
  await expect(display).toHaveText('23:59');
  await page.getByRole('button', { name: 'Pause focus', exact: true }).click();
  await page.clock.fastForward(120000);
  await expect(display).toHaveText('23:59');
  await page.getByRole('button', { name: 'Resume focus', exact: true }).click();
  await page.clock.fastForward(1000);
  await expect(display).toHaveText('23:58');
  await page.getByRole('button', { name: 'Reset timer', exact: true }).click();
  await expect(display).toHaveText('25:00');
  await expect(page.getByRole('button', { name: 'Start focus', exact: true })).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(display).toHaveText('25:00');
});

test('working baseline exposes the board without an obstructing overlay', async ({ page }) => {
  await expect(page.locator('.wrong-version')).toHaveCount(0);
  await expect(page.locator('.board-section')).toBeVisible();
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
