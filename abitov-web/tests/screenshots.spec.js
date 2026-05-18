const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const OUTPUT_DIR = path.resolve(__dirname, '../artifacts/screenshots');

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function shot(page, name) {
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
  await page.screenshot({ path: path.join(OUTPUT_DIR, name), fullPage: true });
}

async function login(page, email, password) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
}

async function navigateInApp(page, url) {
  await page.evaluate((nextUrl) => {
    window.history.pushState({}, '', nextUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, url);
  await expect(page).toHaveURL(new RegExp(`${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
  await page.waitForTimeout(250);
}

test.beforeAll(() => {
  ensureOutputDir();
});

test('capture key screens for admin', async ({ page }) => {
  await login(page, 'admin@abitov.local', 'admin123');
  await shot(page, '01-admin-dashboard.png');

  await navigateInApp(page, '/users');
  await shot(page, '02-admin-users-list.png');

  await navigateInApp(page, '/courses');
  await shot(page, '03-admin-courses-list.png');

  await navigateInApp(page, '/courses/1');
  await shot(page, '04-admin-course-detail.png');

  await navigateInApp(page, '/courses/1/notify');
  await shot(page, '05-admin-course-notify-compose.png');

  await navigateInApp(page, '/enrollments');
  await shot(page, '06-admin-enrollments-list.png');

  await navigateInApp(page, '/enrollments/1');
  await shot(page, '07-admin-enrollment-detail.png');

  await navigateInApp(page, '/enrollments/1/notify');
  await shot(page, '08-admin-enrollment-notify-compose.png');

  await navigateInApp(page, '/notifications');
  await shot(page, '09-admin-notifications.png');
});

test('capture key screens for methodist', async ({ page }) => {
  await login(page, 'methodist@abitov.local', 'teacher123');
  await shot(page, '10-methodist-dashboard.png');

  await navigateInApp(page, '/lessons');
  await shot(page, '11-methodist-lessons-list.png');

  await navigateInApp(page, '/tests');
  await shot(page, '12-methodist-tests-list.png');

  await navigateInApp(page, '/courses/1');
  await shot(page, '13-methodist-course-detail.png');

  await navigateInApp(page, '/courses/1/notify');
  await shot(page, '14-methodist-course-notify-compose.png');
});

test('capture key screens for teacher and client', async ({ page }) => {
  await login(page, 'teacher@abitov.local', 'teacher123');
  await shot(page, '15-teacher-dashboard.png');

  await navigateInApp(page, '/enrollments');
  await shot(page, '16-teacher-enrollments-list.png');

  await navigateInApp(page, '/courses/1');
  await shot(page, '17-teacher-course-detail.png');

  await navigateInApp(page, '/courses/1/notify');
  await shot(page, '18-teacher-course-notify-compose.png');

  await navigateInApp(page, '/enrollments/1');
  await shot(page, '19-teacher-enrollment-detail.png');

  await navigateInApp(page, '/enrollments/1/notify');
  await shot(page, '20-teacher-enrollment-notify-compose.png');

  await navigateInApp(page, '/users/2/edit');
  await shot(page, '21-teacher-profile-edit.png');

  await login(page, 'client1@abitov.local', 'client123');
  await shot(page, '22-client-dashboard.png');

  await navigateInApp(page, '/tests');
  await shot(page, '23-client-tests.png');
});
