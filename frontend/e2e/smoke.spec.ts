import { test, expect } from '@playwright/test'

test.describe('public routes', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/stitchbud/i)
    await expect(page.locator('body')).toBeVisible()
  })

  test('auth page is reachable', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/\/home/)
  })
})

test.describe('auth guards', () => {
  test('dashboard redirects unauthenticated users to /auth', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('projects page redirects unauthenticated users to /auth', async ({ page }) => {
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('library page redirects unauthenticated users to /auth', async ({ page }) => {
    await page.goto('/library')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('friends page redirects unauthenticated users to /auth', async ({ page }) => {
    await page.goto('/friends')
    await expect(page).toHaveURL(/\/auth/)
  })
})
