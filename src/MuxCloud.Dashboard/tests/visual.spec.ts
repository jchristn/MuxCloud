import { expect, test } from '@playwright/test';
import { machines, mockServer } from './mockServer';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 860 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];
const THEMES = ['light', 'dark'] as const;
const ROUTES = [
  '/login',
  '/signup',
  '/machines',
  '/machines/' + machines[0].id,
  '/conversations',
  '/account',
  '/account/billing',
  '/admin',
  '/admin/requests',
  '/admin/explorer',
  '/admin/settings',
  '/admin/users',
  '/legal/terms',
];

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`no horizontal overflow at ${viewport.name} in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript((t) => localStorage.setItem('muxcloud.theme', t), theme);
      await mockServer(page, { authenticated: true });
      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, route + ' scrolls horizontally').toBeLessThanOrEqual(0);
        await page.screenshot({
          path: `test-results/screens/${viewport.name}-${theme}${route.replace(/\//g, '_') || '_root'}.png`,
          fullPage: false,
        });
      }
    });
  }
}

test('pseudo-locales render without clipping the shell', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('muxcloud.pseudo', '1');
    localStorage.setItem('muxcloud.locale', 'qps-ploc');
  });
  await mockServer(page);
  await page.goto('/machines');
  await expect(page.locator('html')).toHaveAttribute('lang', 'qps-ploc');
  await expect(page.locator('h1')).toContainText('Ḿȧƈħīƞḗş');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/screens/pseudo-ploc-machines.png' });
});

test('RTL pseudo-locale and Arabic mirror the shell', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('muxcloud.locale', 'ar'));
  await mockServer(page);
  await page.goto('/machines');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('h1')).toHaveText('الأجهزة');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/screens/rtl-ar-machines.png' });
});
