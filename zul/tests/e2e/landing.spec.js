import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait past the splash screen (1800ms timer)
    await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 12000 });
  });

  test('shows logo and tagline', async ({ page }) => {
    await expect(page.locator('img[alt="Zul"]').first()).toBeVisible();
    await expect(page.getByText('Auto Translate Messenger')).toBeVisible();
  });

  test('shows name input on load', async ({ page }) => {
    await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
    await expect(page.getByText('Create your chat room')).toBeVisible();
  });

  test('language and avatar hidden until name has 2+ chars', async ({ page }) => {
    const langLabel = page.getByText('Your language');
    const avatarLabel = page.getByText('Pick an avatar');
    await expect(langLabel).not.toBeVisible();
    await expect(avatarLabel).not.toBeVisible();

    await page.getByPlaceholder('Enter your name').fill('A');
    await expect(langLabel).not.toBeVisible();

    await page.getByPlaceholder('Enter your name').fill('Al');
    await expect(langLabel).toBeVisible();
    await expect(avatarLabel).toBeVisible();
  });

  test('checkmark appears on valid name', async ({ page }) => {
    await page.getByPlaceholder('Enter your name').fill('Test User');
    await expect(page.locator('span:has-text("✓")')).toBeVisible();
  });

  test('CTA button is disabled with short name', async ({ page }) => {
    const btn = page.getByRole('button', { name: /Create Room/ });
    await expect(btn).toBeDisabled();
    await page.getByPlaceholder('Enter your name').fill('Me');
    await expect(btn).toBeEnabled();
  });

  test('feature pills visible', async ({ page }) => {
    await expect(page.getByText('🔒 Private')).toBeVisible();
    await expect(page.getByText('🌍 Translated')).toBeVisible();
    await expect(page.getByText('⚡ Instant')).toBeVisible();
  });
});
