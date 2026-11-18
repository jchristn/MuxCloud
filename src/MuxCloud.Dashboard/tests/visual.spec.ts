import { expect, test, type Page } from '@playwright/test';
import { machine, machines, mockServer, type MockOptions } from './mockServer';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 860 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];
const THEMES = ['light', 'dark'] as const;
const AUTH_ROUTES = ['/login', '/signup', '/verify', '/forgot', '/reset?token=pwr_x'];
const APP_ROUTES = [
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

const shotName = (prefix: string, route: string) =>
  'test-results/screens/' + prefix + route.replace(/\?.*$/, '').replace(/\//g, '_') + '.png';

async function check(page: Page, theme: string, route: string, prefix: string) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: shotName(prefix, route) });
  expect(overflow, route + ' scrolls horizontally').toBeLessThanOrEqual(0);
  // No table may scroll sideways inside its card at the default column set.
  const inner = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.table-scroll')).some((el) => el.scrollWidth > el.clientWidth + 1),
  );
  if (route === '/machines' || route === '/conversations') expect(inner, route + ' table scrolls sideways').toBe(false);
}

async function setup(page: Page, viewport: (typeof VIEWPORTS)[number], theme: string, options: MockOptions) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.addInitScript((t) => localStorage.setItem('muxcloud.theme', t), theme);
  return mockServer(page, options);
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    const prefix = viewport.name + '-' + theme;

    test(`auth pages signed out at ${viewport.name} in ${theme}`, async ({ page }) => {
      await setup(page, viewport, theme, { authenticated: false });
      for (const route of AUTH_ROUTES) {
        await check(page, theme, route, prefix);
        await expect(page).toHaveURL(new RegExp(route.replace(/[?]/g, '\\?')));
        await expect(page.locator('.sidebar')).toHaveCount(0);
      }
    });

    test(`app pages at ${viewport.name} in ${theme}`, async ({ page }) => {
      await setup(page, viewport, theme, { authenticated: true });
      for (const route of APP_ROUTES) await check(page, theme, route, prefix);
    });

    test(`empty and machine states at ${viewport.name} in ${theme}`, async ({ page }) => {
      await setup(page, viewport, theme, {
        machineList: [
          machine('mch_01JDOFFLINE0000000000000', 'travel-laptop', false),
          machine('mch_01JDREVOKED0000000000000', 'old-desktop', false, { revoked: true }),
          machine('mch_01JDQUIET00000000000000', 'quiet-box', true),
        ],
        emptySessionsFor: ['mch_01JDQUIET00000000000000'],
      });
      await check(page, theme, '/machines/mch_01JDOFFLINE0000000000000', prefix + '-state-offline');
      await check(page, theme, '/machines/mch_01JDREVOKED0000000000000', prefix + '-state-revoked');
      await check(page, theme, '/machines/mch_missing', prefix + '-state-notfound');
      await page.goto('/conversations');
      await page.getByLabel('Machine', { exact: true }).selectOption('mch_01JDQUIET00000000000000');
      await page.screenshot({ path: shotName(prefix + '-state-machine-no-conversations', '') });
    });

    test(`first run at ${viewport.name} in ${theme}`, async ({ page }) => {
      await setup(page, viewport, theme, { machineList: [] });
      await check(page, theme, '/machines', prefix + '-empty');
      await check(page, theme, '/conversations', prefix + '-empty');
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

for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
  test(`Arabic mirrors the shell at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => localStorage.setItem('muxcloud.locale', 'ar'));
    await mockServer(page);
    await page.goto('/machines');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1')).toHaveText('الأجهزة');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: 'test-results/screens/rtl-ar-' + viewport.name + '-machines.png' });
    await page.goto('/login');
    await page.screenshot({ path: 'test-results/screens/rtl-ar-' + viewport.name + '-login.png' });
  });
}
