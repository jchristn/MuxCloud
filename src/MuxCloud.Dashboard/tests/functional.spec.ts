import { expect, test } from '@playwright/test';
import { machine, machines, mockServer } from './mockServer';

test('anonymous visitors are sent to sign in, and signing in lands on machines', async ({ page }) => {
  await mockServer(page, { authenticated: false });
  await page.goto('/machines');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/machines$/);
  await expect(page.getByRole('cell', { name: /^studio-mac mch_/ })).toBeVisible();
  await expect(page.getByTestId('live-status')).toHaveText('Live');
});

test('sign-in errors are localized: wrong password, unverified email, lockout', async ({ page }) => {
  await mockServer(page, { authenticated: false });
  await page.goto('/login');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('That email and password do not match.');
  await page.getByLabel('Password', { exact: true }).fill('locked');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Try again in 120 seconds');
  await page.getByLabel('Email').fill('new@example.com');
  await page.getByLabel('Password', { exact: true }).fill('whatever12');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Verify your email first')).toBeVisible();
  await page.getByRole('button', { name: 'Send the link again' }).click();
  await expect(page.getByText('a new link is on its way')).toBeVisible();
});

test('signup requires accepting the terms and then asks to check email', async ({ page }) => {
  await mockServer(page, { authenticated: false });
  await page.goto('/signup');
  await page.getByLabel('Email').fill('new.user@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByLabel('Confirm password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Accept the Terms of Service and Privacy Policy to continue.')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText('new.user@example.com')).toBeVisible();
});

test('machines update live from the events socket and the action menu opens in a portal', async ({ page }) => {
  const server = await mockServer(page);
  await page.goto('/machines');
  const row = page.getByRole('row', { name: /studio-mac/ });
  await expect(row.getByText('Needs approval')).toBeVisible();
  server.emit({ type: 'machine.offline', machine: { ...machines[0], online: false, awaitingApproval: 0 } });
  await expect(row.getByText('Offline').first()).toBeVisible();
  await row.getByRole('button', { name: 'More actions' }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'View JSON' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Connection history' }).click();
  await expect(page.getByRole('dialog')).toContainText('198.51.100.4');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('clicking a machine row opens rename; add machine shows every surface and the remote-control notice', async ({
  page,
}) => {
  await mockServer(page);
  await page.goto('/machines');
  await page
    .getByRole('row', { name: /travel-laptop/ })
    .getByText('travel-laptop.local')
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Rename machine' })).toBeVisible();
  await dialog.getByLabel('Machine name').fill('travel');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Machine renamed.')).toBeVisible();
  await page.getByRole('button', { name: 'Add a machine' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('mux cloud login');
  await expect(page.getByRole('dialog')).toContainText('Your account can operate these machines');
  await expect(page.getByRole('dialog')).toContainText('cloud.allowRemoteToolApproval');
});

test('machine detail frames the relayed dashboard, and an offline machine reloads when it comes online', async ({
  page,
}) => {
  const server = await mockServer(page);
  await page.goto('/machines/' + machines[0].id);
  const frame = page.frameLocator('[data-testid="machine-frame"]');
  await expect(frame.locator('#mux-dashboard')).toContainText(machines[0].id);
  await expect(page.getByTestId('machine-frame')).toHaveAttribute('src', '/m/' + machines[0].id + '/dashboard');

  await page.goto('/machines/' + machines[1].id);
  await expect(page.getByTestId('machine-offline')).toContainText('travel-laptop is offline');
  server.emit({ type: 'machine.online', machine: machine(machines[1].id, 'travel-laptop', true) });
  await expect(page.frameLocator('[data-testid="machine-frame"]').locator('#mux-dashboard')).toContainText(
    machines[1].id,
  );
});

test('conversations fan out to online machines and report a failing machine', async ({ page }) => {
  await mockServer(page, { failSessionsFor: machines[2].id });
  await page.goto('/conversations');
  await expect(page.getByRole('cell', { name: /Refactor the relay/ })).toBeVisible();
  await expect(page.getByText('Could not load conversations from build-box-with-a-rather-long-name.')).toBeVisible();
  await expect(page.getByText(/Offline machines are not included: travel-laptop/)).toBeVisible();
  await page.getByRole('cell', { name: /Refactor the relay/ }).click();
  await expect(page).toHaveURL(new RegExp('/machines/' + machines[0].id + '\\?session='));
});

test('account sessions and billing without a provider', async ({ page }) => {
  await mockServer(page);
  await page.goto('/account');
  await expect(page.getByRole('cell', { name: /Chrome on macOS/ })).toContainText('This session');
  await page.goto('/account/billing');
  await expect(page.getByText('Paid plans are not available yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose plan' })).toHaveCount(0);
  await expect(page.getByRole('cell', { name: /Connected machines/ })).toBeVisible();
});

test('admin overview chart, request inspector, and API explorer', async ({ page }) => {
  await mockServer(page);
  await page.goto('/admin');
  await expect(page.getByRole('img', { name: 'Requests per interval, succeeded and failed' })).toBeVisible();
  await expect(page.locator('.kpi', { hasText: 'Users' })).toContainText('12');
  await page.goto('/admin/requests');
  await page.getByRole('cell', { name: '/v1.0/api/machines' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Response body');
  await expect(dialog).toContainText('"items"');
  await page.keyboard.press('Escape');
  await page.goto('/admin/explorer');
  await page.getByRole('button', { name: /GET \/v1\.0\/api\/health/ }).click();
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/healthy/).first()).toBeVisible();
  await page.getByRole('button', { name: /DELETE \/v1\.0\/api\/machines\/\{id\}/ }).click();
  await expect(page.getByText('Fill in the required path parameters: id.')).toBeVisible();
});

test('language switch translates the shell, sets lang and dir, and persists', async ({ page }) => {
  await mockServer(page);
  await page.goto('/machines');
  await page.locator('header').getByLabel('Language').selectOption('de');
  await expect(page.getByRole('heading', { name: 'Rechner' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.locator('header').getByLabel('Sprache').selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});
