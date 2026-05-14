import { test, expect } from '@playwright/test';

test('ログイン画面が表示される', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/fiShip/);
});
