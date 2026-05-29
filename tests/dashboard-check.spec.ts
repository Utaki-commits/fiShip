import { test, expect } from '@playwright/test'
import fs from 'fs'

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
const TEST_EMAIL = process.env.TEST_EMAIL || env.TEST_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_PASSWORD || env.TEST_PASSWORD || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : ''

test('ダッシュボード確認', async ({ page }) => {
  fs.mkdirSync('docs/ai-reports/screenshots/dashboard-check', { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })

  if (TEST_EMAIL && TEST_PASSWORD) {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForTimeout(1000)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    const submitButton = page.locator('button[type="submit"]').first()
    if (await submitButton.count()) {
      await submitButton.click()
    } else {
      await page.getByRole('button', { name: /ログイン/ }).first().click()
    }
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
  } else {
    test.skip(!SUPABASE_REF || !SUPABASE_URL, 'Supabase URL が未設定のためダッシュボードをモック撮影できません')
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
    await page.route('**/rest/v1/vessels**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'dashboard-preview-vessel',
          name: 'テスト丸',
          auto_confirm: true,
          setup_completed: true,
        }),
      })
    })
    await page.route('**/rest/v1/bin_settings**', async route => {
      if (route.request().method() === 'HEAD') {
        await route.fulfill({
          status: 206,
          headers: {
            'Content-Range': '0-0/1',
            'Access-Control-Expose-Headers': 'Content-Range',
          },
        })
        return
      }
      await route.fulfill({
        status: 206,
        headers: {
          'Content-Range': '0-0/1',
          'Access-Control-Expose-Headers': 'Content-Range',
        },
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-bin-setting' }]),
      })
    })
    await page.route('**/rest/v1/bookings**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-booking-1',
            vessel_id: 'dashboard-preview-vessel',
            date: new Date().toISOString().slice(0, 10),
            bin_type: 'day',
            name: '山田太郎',
            tel: '09000000000',
            count: 2,
            fishing_style: null,
            message: null,
            status: 'confirmed',
            channel: 'page',
            contacted: false,
            is_charter: false,
            needs_call: true,
            needs_call_reason: '電話確認',
            call_attempts: 0,
          },
        ]),
      })
    })
    await page.route('**/rest/v1/contacts**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
  }

  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForTimeout(1000)
  await expect(page.locator('body')).toBeVisible()
  await page.screenshot({
    path: 'docs/ai-reports/screenshots/dashboard-check/dashboard-full.png',
    fullPage: true,
  })

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  await page.screenshot({
    path: 'docs/ai-reports/screenshots/dashboard-check/dashboard-scroll.png',
    fullPage: true,
  })
})
