import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Runs only against a live server: MUXCLOUD_E2E_BASE_URL, plus MUXCLOUD_E2E_OUTBOX (the File email provider's
// directory, to read verification links) and MUXCLOUD_E2E_ADMIN_EMAIL / MUXCLOUD_E2E_ADMIN_PASSWORD.
const live = !!process.env.MUXCLOUD_E2E_BASE_URL;
const outbox = process.env.MUXCLOUD_E2E_OUTBOX ?? '';
const adminEmail = process.env.MUXCLOUD_E2E_ADMIN_EMAIL ?? '';
const adminPassword = process.env.MUXCLOUD_E2E_ADMIN_PASSWORD ?? '';

test.describe('live server', () => {
  test.skip(!live, 'set MUXCLOUD_E2E_BASE_URL to run against a live server');

  test('sign up, verify by email, sign in, and use the account pages', async ({ page }) => {
    const email = 'e2e-' + Date.now() + '@example.com';
    const password = 'correct horse battery staple';
    await page.goto('/signup');
    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Verify your email first')).toBeVisible();

    let token = '';
    await expect
      .poll(() => {
        const file = readdirSync(outbox).find((f) => f.endsWith('.txt') && f.includes(email));
        const match = file ? /verify\?token=([A-Za-z0-9_-]+)/.exec(readFileSync(join(outbox, file), 'utf8')) : null;
        token = match?.[1] ?? '';
        return token;
      })
      .not.toBe('');
    await page.goto('/verify?token=' + token);
    await expect(page.getByText('is verified')).toBeVisible();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/machines$/);
    await expect(page.getByText('No machines yet')).toBeVisible();
    await expect(page.getByTestId('live-status')).toHaveText('Live');

    await page.goto('/account');
    await expect(page.getByRole('cell', { name: /This session/ })).toBeVisible();
    await page.getByLabel('Last name').fill('Lovelace');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Profile saved.')).toBeVisible();

    await page.goto('/account/billing');
    await expect(page.getByRole('cell', { name: /Connected machines/ })).toBeVisible();

    await page.goto('/conversations');
    await expect(page.getByTestId('conversations-no-machines')).toContainText(
      'Connect a machine to see its conversations here.',
    );

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/machines');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('administrator pages load from the live API', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'set MUXCLOUD_E2E_ADMIN_EMAIL and MUXCLOUD_E2E_ADMIN_PASSWORD');
    await page.goto('/login');
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password', { exact: true }).fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/machines$/);
    for (const [path, heading] of [
      ['/admin', 'Overview'],
      ['/admin/users', 'Users'],
      ['/admin/machines', 'All machines'],
      ['/admin/plans', 'Plans'],
      ['/admin/audit', 'Audit log'],
      ['/admin/requests', 'Request history'],
      ['/admin/settings', 'Server settings'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
    }
    await page.goto('/admin/users');
    await expect(page.getByRole('cell', { name: new RegExp(adminEmail.replace('.', '\\.')) })).toBeVisible();
    await page.goto('/admin/explorer');
    const select = page.getByLabel('API operation');
    const value = await select.evaluate(
      (el) =>
        Array.from((el as HTMLSelectElement).options).find((o) => /^GET\s+\/v1\.0\/api\/health/.test(o.text))?.value ??
        '',
    );
    await select.selectOption(value);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText(/healthy/).first()).toBeVisible();
  });
});
