import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const screenshotDir = 'test-results/screenshots'

test.beforeAll(() => {
  mkdirSync(screenshotDir, { recursive: true })
})

test.describe('major page screenshots at mobile width', () => {
  test('captures login page CTA state', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /LINEではじめる/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /電話番号ではじめる/ })).toBeVisible()
    await page.screenshot({ path: `${screenshotDir}/login-mobile.png`, fullPage: true })
  })

  test('captures legal terms page', async ({ page }) => {
    await page.goto('/legal/terms')
    await expect(page.getByRole('heading', { name: '利用規約' })).toBeVisible()
    await page.screenshot({ path: `${screenshotDir}/terms-mobile.png`, fullPage: true })
  })

  test('captures safe reservation error page', async ({ page }) => {
    await page.goto('/reserve/not-a-valid-vessel-id')
    await expect(page.getByText('URLが正しくありません')).toBeVisible()
    await page.screenshot({ path: `${screenshotDir}/reserve-invalid-mobile.png`, fullPage: true })
  })
})
