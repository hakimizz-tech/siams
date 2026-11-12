import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, DEMO_USERS, signIn, type DemoUser } from '../fixtures/auth';

const ROLES: DemoUser[] = ['student', 'workplace', 'academic', 'coordinator'];

test.describe('authentication', () => {
    for (const who of ROLES) {
        test(`${who}: the session is restored from the refresh cookie`, async ({ page }) => {
            await signIn(page, who);
            await page.goto('/app/dashboard');
            await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
            await expect(page).toHaveURL(/\/app\/dashboard$/);
        });
    }

    test('the session survives a page reload', async ({ page }) => {
        await signIn(page, 'student');
        await page.goto('/app/dashboard');
        await page.reload();
        await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    });

    test('an anonymous visitor is sent to the login page and remembered', async ({ page }) => {
        await page.goto('/app/logbook');
        await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Flogbook$/);
    });

    test('the API rejects a wrong password with the error envelope', async ({ request }) => {
        const response = await request.post('/api/v1/auth/login/', {
            data: { email: DEMO_USERS.student, password: 'definitely-wrong' },
        });
        expect(response.status()).toBe(400);
        expect(Object.keys(await response.json()).sort()).toEqual(['code', 'details', 'message']);
    });
});
