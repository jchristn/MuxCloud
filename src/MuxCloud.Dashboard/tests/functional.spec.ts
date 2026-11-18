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

test('a machine revoked or signed out elsewhere leaves the list live, and Show revoked brings it back', async ({
  page,
}) => {
  const list = machines.map((m) => ({ ...m }));
  const server = await mockServer(page, { machineList: list });
  await page.goto('/machines');
  const row = page.getByRole('row', { name: /travel-laptop/ });
  await expect(row).toBeVisible();
  list[1].revoked = true;
  server.emit({ type: 'machine.updated', machine: { ...list[1] } });
  await expect(row).toHaveCount(0);
  await page.getByLabel('Show revoked').check();
  await expect(page.getByRole('row', { name: /travel-laptop/ })).toBeVisible();
});

test('clicking a machine row opens it; rename is in the row menu; add machine shows every surface', async ({
  page,
}) => {
  await mockServer(page);
  await page.goto('/machines');
  await page
    .getByRole('row', { name: /studio-mac/ })
    .getByText('studio-mac.local')
    .click();
  await expect(page).toHaveURL(new RegExp('/machines/' + machines[0].id + '$'));
  await page.goto('/machines');
  await page
    .getByRole('row', { name: /travel-laptop/ })
    .getByRole('button', { name: 'More actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Rename' }).click();
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
  await page.locator('header').getByRole('button', { name: 'Language' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Deutsch' }).click();
  await expect(page.getByRole('heading', { name: 'Rechner' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.locator('header').getByRole('button', { name: 'Sprache' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('auth forms validate inline and keep the primary action enabled', async ({ page }) => {
  await mockServer(page, { authenticated: false });
  await page.goto('/login');
  const signIn = page.getByRole('button', { name: 'Sign in' });
  await expect(signIn).toBeEnabled();
  await signIn.click();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password', { exact: true }).click();
  await expect(page.getByText('Enter an email address like name@example.com.')).toBeVisible();
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(page).toHaveURL(/\/forgot$/);
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm password').fill('different');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Use at least 10 characters.')).toBeVisible();
  await expect(page.getByText('The passwords do not match.')).toBeVisible();
});

test('phones render tables as cards with compact paging', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const many = Array.from({ length: 30 }, (_, i) =>
    machine('mch_01JDMANY' + String(i).padStart(17, '0'), 'box-' + i, i % 2 === 0),
  );
  await mockServer(page, { machineList: many });
  await page.goto('/machines');
  await expect(page.locator('.row-card').first()).toBeVisible();
  await expect(page.locator('table.data')).toHaveCount(0);
  await expect(page.locator('.pager-compact')).toContainText('1-25 of 30');
  await expect(page.getByRole('combobox', { name: 'Rows per page' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Select columns' })).toHaveCount(0);
});

test('pagination is hidden when everything fits on one page', async ({ page }) => {
  await mockServer(page);
  await page.goto('/machines');
  await expect(page.getByRole('cell', { name: /^studio-mac mch_/ })).toBeVisible();
  await expect(page.locator('.pager')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add a machine' })).toHaveCount(1);
});

for (const [width, height] of [
  [1280, 860],
  [768, 1024],
  [390, 844],
]) {
  test(`machine frame fills the remaining height without double scrollbars at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockServer(page);
    await page.goto('/machines/' + machines[0].id);
    const frame = page.getByTestId('machine-frame');
    await expect(frame).toBeVisible();
    const box = (await frame.boundingBox())!;
    // The machine controls live in the single topbar row, so the frame starts right under it.
    const bar = (await page.locator('header.topbar').boundingBox())!;
    expect(Math.round(box.y)).toBe(Math.round(bar.y + bar.height));
    await expect(page.locator('header.topbar #machine-switcher')).toBeVisible();
    expect(Math.round(box.y + box.height)).toBe(height);
    const scroll = await page.evaluate(() => ({
      page: document.documentElement.scrollHeight - window.innerHeight,
      main: (() => {
        const m = document.querySelector('main.content') as HTMLElement;
        return m.scrollHeight - m.clientHeight;
      })(),
    }));
    expect(scroll.page).toBeLessThanOrEqual(0);
    expect(scroll.main).toBeLessThanOrEqual(0);
  });
}

test('every topbar control and status pill has a tooltip', async ({ page }) => {
  await mockServer(page);
  for (const route of ['/machines', '/machines/' + machines[0].id]) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const missing = await page.evaluate(() =>
      Array.from(document.querySelectorAll('header.topbar :is(a, button, select, .pill)'))
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .filter((el) => !(el.getAttribute('title') ?? '').trim())
        .map((el) => el.outerHTML.slice(0, 120)),
    );
    expect(missing, route).toEqual([]);
  }
});

test('a chunk missing after a redeploy reloads once, then explains the update', async ({ page }) => {
  await mockServer(page);
  await page.route(/\/assets\/AccountPage-[^/]+\.js$/, (route) => route.fulfill({ status: 404, body: 'Not found' }));
  await page.goto('/machines');
  await page.getByRole('link', { name: 'Profile and security' }).first().click();
  await expect(page.getByRole('heading', { name: 'Mux Cloud was updated' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
});
