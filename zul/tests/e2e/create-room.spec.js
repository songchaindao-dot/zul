import { test, expect } from '@playwright/test';

test.describe('Create room flow', () => {
  test('creates a room and lands in chat', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 12000 });

    await page.getByPlaceholder('Enter your name').fill('E2E Tester');
    await expect(page.getByText('Your language')).toBeVisible();

    // Pick a language (select has no for/id, use locator directly)
    await page.locator('select').first().selectOption('es');

    // Pick an avatar
    await page.locator('button').filter({ hasText: '🌸' }).first().click();

    // Create the room
    await page.getByRole('button', { name: /Create Room/ }).click();

    // Should transition to chat view
    await expect(page).toHaveURL(/room=|\/r\//, { timeout: 15000 });
    await expect(page.getByPlaceholder('Write a message…')).toBeVisible({ timeout: 10000 });
  });

  test('share link is displayed in chat after creation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 12000 });
    await page.getByPlaceholder('Enter your name').fill('LinkTest');
    await page.getByRole('button', { name: /Create Room/ }).click();

    await page.waitForURL(/room=/, { timeout: 15000 });
    // Copy button or link should be visible when no partner yet
    await expect(page.getByRole('button', { name: /Copy/ })).toBeVisible({ timeout: 8000 });
  });
});
