import { expect, test } from '@playwright/test'

test.describe('public mobile smoke checks', () => {
  test('login page exposes captain login choices', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: '遊漁船予約システム' })).toBeVisible()
    await expect(page.getByRole('button', { name: /LINEではじめる/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /電話番号ではじめる/ })).toBeVisible()
  })

  test('legal terms page exposes the service rules', async ({ page }) => {
    await page.goto('/legal/terms')
    await expect(page.getByRole('heading', { name: '利用規約' })).toBeVisible()
    await expect(page.getByText('UTAKI SYSTEM').first()).toBeVisible()
  })

  test('reserve page handles an invalid vessel id safely', async ({ page }) => {
    await page.goto('/reserve/not-a-valid-vessel-id')
    await expect(page.getByText('URLが正しくありません')).toBeVisible()
  })
})
