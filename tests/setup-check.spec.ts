import { test, expect } from '@playwright/test'
import fs from 'fs'

const TEST_EMAIL = process.env.TEST_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const env = fs.existsSync('.env.local')
  ? Object.fromEntries(
    fs.readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter(line => line && !line.trim().startsWith('#') && line.includes('='))
      .map(line => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')]
      })
  )
  : {}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : ''

test('セットアップ画面確認', async ({ page }) => {
  fs.mkdirSync('docs/ai-reports/screenshots/setup', { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto(`${BASE_URL}/login`)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'docs/ai-reports/screenshots/setup/login.png', fullPage: true })

  if (TEST_EMAIL && TEST_PASSWORD) {
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.getByRole('button', { name: 'ログインする' }).click()
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
  } else {
    test.skip(!SUPABASE_REF, 'NEXT_PUBLIC_SUPABASE_URL が未設定のためセットアップ画面をモック撮影できません')
    await page.addInitScript((ref) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      const session = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: expiresAt,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'mock-user-id',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      }
      window.localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session))
    }, SUPABASE_REF)
    await page.route(`${SUPABASE_URL}/rest/v1/vessels**`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([{ id: 'setup-preview-vessel', name: 'テスト丸' }]),
      })
    })
  }

  await page.goto(`${BASE_URL}/dashboard/setup`)
  await expect(page.getByText('船の情報を登録しましょう')).toBeVisible()
  await page.screenshot({ path: 'docs/ai-reports/screenshots/setup/step1.png', fullPage: true })
  await page.waitForTimeout(500)

  await page.goto(`${BASE_URL}/dashboard/setup?step=2`)
  await expect(page.getByText('出船する便を設定しましょう')).toBeVisible()
  await page.screenshot({ path: 'docs/ai-reports/screenshots/setup/step2.png', fullPage: true })

  await page.goto(`${BASE_URL}/dashboard/setup?step=3`)
  await expect(page.getByText('既存の予約がありますか？')).toBeVisible()
  await page.screenshot({ path: 'docs/ai-reports/screenshots/setup/step3.png', fullPage: true })

  await page.goto(`${BASE_URL}/dashboard/setup?step=4`)
  await expect(page.getByText('準備完了！')).toBeVisible()
  await page.screenshot({ path: 'docs/ai-reports/screenshots/setup/step4.png', fullPage: true })
})
