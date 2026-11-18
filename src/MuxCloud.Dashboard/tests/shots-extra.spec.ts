import { test } from '@playwright/test';
import { mockServer } from './mockServer';

// Extra screenshots of interactive states, for visual review and docs.
test('auth error and validation states', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.addInitScript(() => localStorage.setItem('muxcloud.theme', 'dark'));
  await mockServer(page, { authenticated: false });
  await page.goto('/login');
  await page.getByLabel('Email').fill('ada@example');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.screenshot({ path: 'test-results/screens/tablet-dark-login-validation.png' });
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('alert').first().waitFor();
  await page.screenshot({ path: 'test-results/screens/tablet-dark-login-error.png' });
});

test('topbar language menu open', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await mockServer(page);
  await page.goto('/machines');
  await page.locator('header').getByRole('button', { name: 'Language' }).click();
  await page.screenshot({ path: 'test-results/screens/desktop-light-language-menu.png' });
});

test('phone drawer shows navigation and language', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockServer(page);
  await page.goto('/machines');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/screens/mobile-light-drawer.png' });
});
