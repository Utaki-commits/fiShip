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
const USE_REAL_LOGIN = process.env.PLAYWRIGHT_USE_REAL_LOGIN === '1' && TEST_EMAIL && TEST_PASSWORD
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : ''
const toLocalDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

test('ダッシュボード確認', async ({ page }) => {
  fs.mkdirSync('docs/ai-reports/screenshots/dashboard-check', { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })

  if (USE_REAL_LOGIN) {
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
          captain_name: '山田船長',
          banner_url: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800',
          auto_confirm: true,
          setup_completed: true,
          date_format: 'western',
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
        body: JSON.stringify([{
          id: 'mock-bin-setting',
          vessel_id: 'dashboard-preview-vessel',
          bin_type: 'day',
          meeting_time: '05:30',
          departure_time: '06:00',
          fish_types: ['タイラバ'],
        }]),
      })
    })
    await page.route('**/rest/v1/bookings**', async route => {
      const today = toLocalDateStr(new Date())
      const tomorrow = toLocalDateStr(new Date(Date.now() + 86400000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-booking-1',
            vessel_id: 'dashboard-preview-vessel',
            date: today,
            bin_type: 'day',
            name: '山田太郎',
            tel: '09012345678',
            count: 1,
            fishing_style: 'タイラバ',
            message: null,
            status: 'confirmed',
            channel: 'page',
            contacted: true,
            is_charter: false,
            needs_call: false,
            needs_call_reason: null,
            call_attempts: 0,
          },
          {
            id: 'mock-booking-2',
            vessel_id: 'dashboard-preview-vessel',
            date: today,
            bin_type: 'day',
            name: '佐藤花子',
            tel: '09087654321',
            count: 1,
            fishing_style: 'タイラバ',
            message: '出船確認未完了',
            status: 'confirmed',
            channel: 'page',
            contacted: false,
            is_charter: false,
            needs_call: true,
            needs_call_reason: '出船確認未完了',
            call_attempts: 0,
          },
          {
            id: 'mock-booking-3',
            vessel_id: 'dashboard-preview-vessel',
            date: today,
            bin_type: 'day',
            name: '田中一郎',
            tel: '09011112222',
            count: 1,
            fishing_style: 'タイラバ',
            message: null,
            status: 'confirmed',
            channel: 'page',
            contacted: true,
            is_charter: false,
            needs_call: false,
            needs_call_reason: null,
            call_attempts: 0,
          },
          {
            id: 'mock-booking-4',
            vessel_id: 'dashboard-preview-vessel',
            date: today,
            bin_type: 'day',
            name: '鈴木次郎',
            tel: '09033334444',
            count: 1,
            fishing_style: 'タイラバ',
            message: null,
            status: 'confirmed',
            channel: 'page',
            contacted: true,
            is_charter: false,
            needs_call: false,
            needs_call_reason: null,
            call_attempts: 0,
          },
          {
            id: 'mock-booking-5',
            vessel_id: 'dashboard-preview-vessel',
            date: today,
            bin_type: 'day',
            name: '高橋三郎',
            tel: '09055556666',
            count: 1,
            fishing_style: 'タイラバ',
            message: null,
            status: 'confirmed',
            channel: 'page',
            contacted: true,
            is_charter: false,
            needs_call: false,
            needs_call_reason: null,
            call_attempts: 0,
          },
          {
            id: 'mock-booking-6',
            vessel_id: 'dashboard-preview-vessel',
            date: today,
            bin_type: 'day',
            name: '伊藤五郎',
            tel: '09066667777',
            count: 1,
            fishing_style: 'タイラバ',
            message: null,
            status: 'confirmed',
            channel: 'page',
            contacted: true,
            is_charter: false,
            needs_call: false,
            needs_call_reason: null,
            call_attempts: 0,
          },
          {
            id: 'mock-booking-7',
            vessel_id: 'dashboard-preview-vessel',
            date: tomorrow,
            bin_type: 'day',
            name: '山本一郎',
            tel: '09022223333',
            count: 2,
            fishing_style: 'SLJ',
            message: null,
            status: 'confirmed',
            channel: 'page',
            contacted: false,
            is_charter: false,
            needs_call: false,
            needs_call_reason: null,
            call_attempts: 0,
          },
          {
            id: 'mock-booking-8',
            vessel_id: 'dashboard-preview-vessel',
            date: tomorrow,
            bin_type: 'day',
            name: '承認待ち太郎',
            tel: '09099990000',
            count: 1,
            fishing_style: 'SLJ',
            message: null,
            status: 'pending',
            channel: 'page',
            contacted: false,
            is_charter: false,
            needs_call: false,
            needs_call_reason: null,
            call_attempts: 0,
          },
        ]),
      })
    })
    await page.route('**/rest/v1/contacts**', async route => {
      const tomorrow = toLocalDateStr(new Date(Date.now() + 86400000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-contact-1',
            name: '中村四郎',
            tel: '09077778888',
            message: '貸切で相談したいです',
            preferred_date: tomorrow,
            is_charter: true,
            is_negotiating: true,
          },
        ]),
      })
    })
    await page.route('**/rest/v1/sns_messages**', async route => {
      const url = route.request().url()
      const count = url.includes('channel=eq.instagram') ? 1 : 2
      await route.fulfill({
        status: 206,
        headers: {
          'Content-Range': `0-${count - 1}/${count}`,
          'Access-Control-Expose-Headers': 'Content-Range',
        },
      })
    })
  }

  await page.route('**/rest/v1/vessels**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'dashboard-preview-vessel',
        name: 'テスト丸',
        captain_name: '山田船長',
        banner_url: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800',
        auto_confirm: true,
        setup_completed: true,
        date_format: 'western',
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
      body: JSON.stringify([{
        id: 'mock-bin-setting',
        vessel_id: 'dashboard-preview-vessel',
        bin_type: 'day',
        meeting_time: '05:30',
        departure_time: '06:00',
        fish_types: ['タイラバ'],
      }]),
    })
  })
  await page.route('**/rest/v1/bookings**', async route => {
    const today = toLocalDateStr(new Date())
    const tomorrow = toLocalDateStr(new Date(Date.now() + 86400000))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'mock-booking-1', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '山田太郎', tel: '09012345678', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-2', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '佐藤花子', tel: '09087654321', count: 1, fishing_style: 'タイラバ', message: '出船確認未完了', status: 'confirmed', channel: 'page', contacted: false, is_charter: false, needs_call: true, needs_call_reason: '出船確認未完了', call_attempts: 0 },
        { id: 'mock-booking-3', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '田中一郎', tel: '09011112222', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-4', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '鈴木次郎', tel: '09033334444', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-5', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '高橋三郎', tel: '09055556666', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-6', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '伊藤五郎', tel: '09066667777', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-7', vessel_id: 'dashboard-preview-vessel', date: tomorrow, bin_type: 'day', name: '山本一郎', tel: '09022223333', count: 2, fishing_style: 'SLJ', message: null, status: 'confirmed', channel: 'page', contacted: false, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-8', vessel_id: 'dashboard-preview-vessel', date: tomorrow, bin_type: 'day', name: '承認待ち太郎', tel: '09099990000', count: 1, fishing_style: 'SLJ', message: null, status: 'pending', channel: 'page', contacted: false, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
      ]),
    })
  })
  await page.route('**/rest/v1/contacts**', async route => {
    const tomorrow = toLocalDateStr(new Date(Date.now() + 86400000))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'mock-contact-1', name: '中村四郎', tel: '09077778888', message: '貸切で相談したいです', preferred_date: tomorrow, is_charter: true, is_negotiating: true }]),
    })
  })
  await page.route('**/rest/v1/sns_messages**', async route => {
    const url = route.request().url()
    const count = url.includes('channel=eq.instagram') ? 1 : 2
    await route.fulfill({
      status: 206,
      headers: {
        'Content-Range': `0-${count - 1}/${count}`,
        'Access-Control-Expose-Headers': 'Content-Range',
      },
    })
  })
  await page.route(/.*\/rest\/v1\/bookings.*/, async route => {
    const today = toLocalDateStr(new Date())
    const tomorrow = toLocalDateStr(new Date(Date.now() + 86400000))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'mock-booking-1', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '山田太郎', tel: '09012345678', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-2', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '佐藤花子', tel: '09087654321', count: 1, fishing_style: 'タイラバ', message: '出船確認未完了', status: 'confirmed', channel: 'page', contacted: false, is_charter: false, needs_call: true, needs_call_reason: '出船確認未完了', call_attempts: 0 },
        { id: 'mock-booking-3', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '田中一郎', tel: '09011112222', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-4', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '鈴木次郎', tel: '09033334444', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-5', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '高橋三郎', tel: '09055556666', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-6', vessel_id: 'dashboard-preview-vessel', date: today, bin_type: 'day', name: '伊藤五郎', tel: '09066667777', count: 1, fishing_style: 'タイラバ', message: null, status: 'confirmed', channel: 'page', contacted: true, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-7', vessel_id: 'dashboard-preview-vessel', date: tomorrow, bin_type: 'day', name: '山本一郎', tel: '09022223333', count: 2, fishing_style: 'SLJ', message: null, status: 'confirmed', channel: 'page', contacted: false, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
        { id: 'mock-booking-8', vessel_id: 'dashboard-preview-vessel', date: tomorrow, bin_type: 'day', name: '承認待ち太郎', tel: '09099990000', count: 1, fishing_style: 'SLJ', message: null, status: 'pending', channel: 'page', contacted: false, is_charter: false, needs_call: false, needs_call_reason: null, call_attempts: 0 },
      ]),
    })
  })

  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForTimeout(1000)
  await expect(page.locator('body')).toBeVisible()
  await page.screenshot({
    path: 'docs/ai-reports/screenshots/dashboard-check/dashboard-latest.png',
    fullPage: true,
  })
})
