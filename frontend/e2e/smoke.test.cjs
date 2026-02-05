/**
 * E2E Smoke Tests — Playwright
 *
 * Prerequisites:
 *   cd backend  &&  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
 *   cd frontend &&  npm run dev   (port 5173, proxies /api → 8000)
 *
 * The backend must be seeded with the test users below.  If running against
 * a fresh SQLite DB the seed happens automatically on first request (the
 * ORM creates tables).  For a pre-seeded DB use the conftest seed data:
 *
 *   state@test.com        / Test123!@#   → STATE_OFFICIAL
 *   lga@test.com          / Test123!@#   → LGA_COORDINATOR  (lga_id=1)
 *   wdc@test.com          / Test123!@#   → WDC_SECRETARY    (ward_id=1)
 *   wdc2@test.com         / Test123!@#   → WDC_SECRETARY    (ward_id=3)
 *
 * Run:
 *   cd frontend
 *   npm run test:e2e
 */

const { expect } = require('@playwright/test');
const { test } = require('@playwright/test');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const USERS = {
  state:  { email: 'state@test.com',  password: 'Test123!@#' },
  lga:    { email: 'lga@test.com',    password: 'Test123!@#' },
  wdc:    { email: 'wdc@test.com',    password: 'Test123!@#' },
  wdc2:   { email: 'wdc2@test.com',   password: 'Test123!@#' },
};

async function loginAs(page, role) {
  await page.goto(`${BASE}/login`);
  await page.fill('#email', USERS[role].email);
  await page.fill('#password', USERS[role].password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from /login
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
}

async function logout(page) {
  // Settings page has a logout button; alternatively clear storage
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
  await page.goto(`${BASE}/login`);
  await page.waitForURL(/login/);
}

// ---------------------------------------------------------------------------
// 1. Login + correct landing route per role
// ---------------------------------------------------------------------------
test('STATE_OFFICIAL lands on /state after login', async ({ page }) => {
  await loginAs(page, 'state');
  await expect(page).toHaveURL(/\/state/);
});

test('LGA_COORDINATOR lands on /lga after login', async ({ page }) => {
  await loginAs(page, 'lga');
  await expect(page).toHaveURL(/\/lga/);
});

test('WDC_SECRETARY lands on /wdc after login', async ({ page }) => {
  await loginAs(page, 'wdc');
  await expect(page).toHaveURL(/\/wdc/);
});

// ---------------------------------------------------------------------------
// 2. Invalid credentials → error shown, stays on login
// ---------------------------------------------------------------------------
test('wrong password shows error, stays on login', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.fill('#email', 'state@test.com');
  await page.fill('#password', 'wrongpassword');
  await page.click('button[type="submit"]');
  // Should remain on login
  await expect(page).toHaveURL(/login/);
  // An error message should appear (the Alert component renders text)
  await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// 3. Protected routes redirect unauthenticated users to login
// ---------------------------------------------------------------------------
test('unauthenticated user hitting /wdc is redirected to /login', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  // Ensure no token in storage
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(`${BASE}/wdc`);
  await expect(page).toHaveURL(/login/, { timeout: 5000 });
});

test('unauthenticated user hitting /state is redirected to /login', async ({ page }) => {
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(`${BASE}/state`);
  await expect(page).toHaveURL(/login/, { timeout: 5000 });
});

// ---------------------------------------------------------------------------
// 4. WDC dashboard loads and shows ward name
// ---------------------------------------------------------------------------
test('WDC dashboard displays ward name', async ({ page }) => {
  await loginAs(page, 'wdc');
  // The dashboard fetches data; wait for page to settle
  await page.waitForTimeout(2000);
  // The page should contain the ward name from seed data
  await expect(page.locator('text=Magajin Gari')).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// 5. Notifications page loads with correct structure
// ---------------------------------------------------------------------------
test('WDC can open notifications page', async ({ page }) => {
  await loginAs(page, 'wdc');
  // Navigate to notifications — the nav has a Bell icon linking to /notifications
  // Use the route directly
  await page.goto(`${BASE}/notifications`);
  await page.waitForTimeout(1500);
  // Page should load without crash — look for the heading or bell icon text
  await expect(page.locator('text=Notifications')).toBeVisible({ timeout: 5000 });
});

test('STATE can open notifications page', async ({ page }) => {
  await loginAs(page, 'state');
  await page.goto(`${BASE}/notifications`);
  await page.waitForTimeout(1500);
  await expect(page.locator('text=Notifications')).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// 6. API health check is reachable (smoke — confirms backend is up)
// ---------------------------------------------------------------------------
test('health endpoint returns healthy', async ({ request }) => {
  const response = await request.get(`${BASE}/api/health`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.status).toBe('healthy');
});

// ---------------------------------------------------------------------------
// 7. Login via API → token is a non-empty string
// ---------------------------------------------------------------------------
test('login API returns valid token structure', async ({ request }) => {
  const response = await request.post(`${BASE}/api/auth/login`, {
    data: { email: 'state@test.com', password: 'Test123!@#' },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.access_token).toBeTruthy();
  expect(body.token_type).toBe('bearer');
  expect(body.user.role).toBe('STATE_OFFICIAL');
});

// ---------------------------------------------------------------------------
// 8. /me endpoint returns correct user after login (API-level)
// ---------------------------------------------------------------------------
test('/auth/me returns authenticated user', async ({ request }) => {
  // Login first
  const loginResp = await request.post(`${BASE}/api/auth/login`, {
    data: { email: 'wdc@test.com', password: 'Test123!@#' },
  });
  const { access_token } = await loginResp.json();

  const meResp = await request.get(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  expect(meResp.status()).toBe(200);
  const user = await meResp.json();
  expect(user.email).toBe('wdc@test.com');
  expect(user.role).toBe('WDC_SECRETARY');
});

// ---------------------------------------------------------------------------
// 9. Role gating: WDC cannot access STATE-only endpoints (API)
// ---------------------------------------------------------------------------
test('WDC token is rejected on /users/summary (STATE only)', async ({ request }) => {
  const loginResp = await request.post(`${BASE}/api/auth/login`, {
    data: { email: 'wdc@test.com', password: 'Test123!@#' },
  });
  const { access_token } = await loginResp.json();

  const resp = await request.get(`${BASE}/api/users/summary`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  expect(resp.status()).toBe(403);
});

test('LGA token is rejected on /investigations (STATE only)', async ({ request }) => {
  const loginResp = await request.post(`${BASE}/api/auth/login`, {
    data: { email: 'lga@test.com', password: 'Test123!@#' },
  });
  const { access_token } = await loginResp.json();

  const resp = await request.get(`${BASE}/api/investigations`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  expect(resp.status()).toBe(403);
});
