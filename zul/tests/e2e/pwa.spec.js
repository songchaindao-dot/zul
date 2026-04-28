import { test, expect } from '@playwright/test';

test.describe('PWA & assets', () => {
  test('manifest.json has correct name and icons', async ({ page }) => {
    const resp = await page.goto('/manifest.json');
    expect(resp.status()).toBe(200);
    const manifest = await resp.json();
    expect(manifest.name).toBe('Zul: Bilingual Chat');
    expect(manifest.short_name).toBe('Zul');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  });

  test('icon-192.png is served', async ({ page }) => {
    const resp = await page.goto('/icon-192.png');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('image');
  });

  test('apple-touch-icon.png is served', async ({ page }) => {
    const resp = await page.goto('/apple-touch-icon.png');
    expect(resp.status()).toBe(200);
  });

  test('service worker is registered', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hasSW = await page.evaluate(() =>
      navigator.serviceWorker
        ? navigator.serviceWorker.getRegistrations().then((r) => r.length > 0)
        : false,
    );
    expect(hasSW).toBe(true);
  });

  test('page title has no em dash', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).not.toContain('—'); // em dash
    expect(title).toContain('Zul');
  });
});
