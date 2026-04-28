import { test, expect } from '@playwright/test';

// Creates a real room via the API, then tests the join flow with a second browser context.
test.describe('Setup / Join flow', () => {
  let inviteURL;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 12000 });
    await page.getByPlaceholder('Enter your name').fill('Room Creator');
    await page.getByRole('button', { name: /Create Room/ }).click();
    await page.waitForURL(/room=/, { timeout: 15000 });

    // Grab the invite URL from the copy button's sibling text or from a visible link
    inviteURL = page.url();
    await ctx.close();
  });

  test('invite URL shows setup page for new user', async ({ page }) => {
    // A fresh context has no localStorage → should go to setup
    await page.goto(inviteURL);
    await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 12000 });
    await expect(page.getByText("You've been invited")).toBeVisible();
    await expect(page.getByText('Set up your profile to join the conversation')).toBeVisible();
  });

  test('joining via invite link lands in chat', async ({ page }) => {
    await page.goto(inviteURL);
    await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 12000 });

    await page.getByPlaceholder('Enter your name').fill('New Joiner');
    await expect(page.getByText('Your language')).toBeVisible();
    await page.locator('select').first().selectOption('fr');
    await page.getByRole('button', { name: /Join Conversation/ }).click();

    await expect(page.getByPlaceholder('Write a message…')).toBeVisible({ timeout: 15000 });
  });
});
