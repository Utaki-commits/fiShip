import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const vesselId = process.env.PLAYWRIGHT_RESERVE_VESSEL_ID
const screenshotDir = 'test-results/screenshots'

test.beforeAll(() => {
  mkdirSync(screenshotDir, { recursive: true })
})

test.describe('reservation flow validation', () => {
  test('shows reservation route and CTA for a configured vessel', async ({ page }) => {
    test.skip(!vesselId, 'Set PLAYWRIGHT_RESERVE_VESSEL_ID to validate a real reservation route.')

    await page.goto(`/reserve/${vesselId}`)
    await expect(page.getByText(/予約|受付|満員/).first()).toBeVisible()
    await page.screenshot({ path: `${screenshotDir}/reserve-flow-mobile.png`, fullPage: true })
  })
})
