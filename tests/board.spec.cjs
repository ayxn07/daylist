const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('/');
});

test('columns and progress reflect actual task status', async ({ page }) => {
  await expect(page.locator('#todo-list .task-card')).toHaveCount(2);
  await expect(page.locator('#doing-list .task-card')).toHaveCount(1);
  await expect(page.locator('#done-list .task-card')).toHaveCount(1);
  await expect(page.locator('#progress-label')).toHaveText('1 of 4 done');
  await expect(page.locator('#progress-fill')).toHaveAttribute('style', 'width: 25%;');
});

test('create, edit, move and delete persist without interrupting focus', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task name').fill('Complete the Git challenge');
  await page.getByLabel('Notes (optional)').fill('Test the restored board');
  await page.getByLabel('Priority', { exact: true }).selectOption('high');
  await page.getByRole('button', { name: 'Save task' }).click();
  await expect(page.locator('#todo-list .task-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Edit Complete the Git challenge' }).click();
  await page.getByLabel('Task name').fill('Ship the challenge');
  await page.getByRole('button', { name: 'Save task' }).click();
  await page.getByRole('combobox', { name: 'Move Ship the challenge' }).selectOption('done');
  await expect(page.locator('#done-list h4')).toContainText(['Take the first step', 'Ship the challenge']);
  await page.clock.fastForward(1000);
  await expect(page.getByRole('timer')).toHaveText('24:59');
  await page.reload();
  await expect(page.getByRole('timer')).toHaveText('25:00');
  await expect(page.locator('#done-list .task-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Edit Ship the challenge' }).click();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await page.reload();
  await expect(page.locator('.task-card')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('dragging between columns updates persistence and progress', async ({ page }) => {
  await page.locator('[data-id="welcome-1"]').dragTo(page.locator('#done-list'));
  await expect(page.locator('#done-list .task-card')).toHaveCount(2);
  await expect(page.locator('#progress-label')).toHaveText('2 of 4 done');
  await page.reload();
  await expect(page.locator('#done-list .task-card')).toHaveCount(2);
});

test('theme switches both ways and survives reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('clear completed confirms first and retains other tasks', async ({ page }) => {
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Clear completed', exact: true }).click();
  await expect(page.locator('.task-card')).toHaveCount(4);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clear completed', exact: true }).click();
  await expect(page.locator('.task-card')).toHaveCount(3);
  await expect(page.locator('#progress-label')).toHaveText('0 of 3 done');
  await expect(page.getByRole('button', { name: 'Clear completed', exact: true })).toBeDisabled();
});

test('empty or malformed storage never produces invalid progress', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('daylist.tasks.v1', '[]'));
  await page.reload();
  await expect(page.locator('#progress-label')).toHaveText('0 of 0 done');
  await expect(page.locator('#progress-fill')).toHaveAttribute('style', 'width: 0%;');
  await page.evaluate(() => localStorage.setItem('daylist.tasks.v1', 'not JSON'));
  await page.reload();
  await expect(page.locator('.task-card')).toHaveCount(4);
});

test('timer and board fit mobile and desktop in both themes', async ({ page }, testInfo) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole('timer')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Start focus', exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${width}-${theme}.png`), fullPage: true });
    }
  }
});
