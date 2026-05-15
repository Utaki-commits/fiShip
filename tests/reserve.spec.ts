import { test, expect } from '@playwright/test'

test('予約フォームが表示される', async ({ page }) => {
  await page.goto('/reserve')
  await expect(page.locator('body')).toBeVisible()
})
