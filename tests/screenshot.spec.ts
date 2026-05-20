import { test, expect } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

test.describe('旭波デザイン スクリーンショット', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('ログイン画面', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'screenshots/login.png',
      fullPage: true
    })
    await expect(page.locator('body')).toBeVisible()
  })

  test('ダッシュボード', async ({ page }) => {
    // ログイン
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')

    if (TEST_EMAIL && TEST_PASSWORD) {
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      const submitButton = page.locator('button[type="submit"]').first()
      if (await submitButton.count()) {
        await submitButton.click()
      } else {
        await page.getByRole('button', { name: /ログイン/ }).first().click()
      }
      await page.waitForURL('**/dashboard**', { timeout: 10000 })
    }

    await page.screenshot({
      path: 'screenshots/dashboard.png',
      fullPage: true
    })
    await expect(page.locator('body')).toBeVisible()
  })

  test('予約フォーム', async ({ page }) => {
    await page.goto(`${BASE_URL}/reserve`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: 'screenshots/reserve.png',
      fullPage: true
    })
    await expect(page.locator('body')).toBeVisible()
  })

})
