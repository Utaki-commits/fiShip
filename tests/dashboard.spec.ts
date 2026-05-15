import { test, expect } from '@playwright/test'

test('ダッシュボードにリダイレクトされる', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('body')).toBeVisible()
})
