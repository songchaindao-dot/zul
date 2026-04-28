import { test, expect } from '@playwright/test';

async function createAndEnterRoom(page, name = 'MsgTester') {
  await page.goto('/');
  await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 12000 });
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByRole('button', { name: /Create Room/ }).click();
  await page.waitForURL(/room=/, { timeout: 15000 });
  await expect(page.getByPlaceholder('Write a message…')).toBeVisible({ timeout: 10000 });
}

test.describe('Send message', () => {
  test('user can type and send a message', async ({ page }) => {
    await createAndEnterRoom(page);

    const composer = page.getByPlaceholder('Write a message…');
    await composer.fill('Hello E2E world');
    await page.keyboard.press('Enter');

    // Message should appear in the chat bubble
    await expect(page.getByText('Hello E2E world')).toBeVisible({ timeout: 12000 });
  });

  test('send button appears when text is entered', async ({ page }) => {
    await createAndEnterRoom(page, 'BtnTester');
    const composer = page.getByPlaceholder('Write a message…');

    // Before typing: submit button should not exist (mic button shown instead)
    await expect(page.locator('form button[type="submit"]')).not.toBeVisible();

    // After typing, send button appears and mic button is gone
    await composer.fill('hi');
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test('message appears without 502 error', async ({ page }) => {
    const errors = [];
    page.on('response', (resp) => {
      if (resp.url().includes('/api/messages/send') && resp.status() >= 500) {
        errors.push(resp.status());
      }
    });

    await createAndEnterRoom(page, 'ErrorCheck');
    await page.getByPlaceholder('Write a message…').fill('Test message');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);

    expect(errors).toHaveLength(0);
  });
});
