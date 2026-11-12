import { expect, test } from '@playwright/test';
import { signIn } from '../fixtures/auth';

test.describe('access control', () => {
    test('a student cannot open coordinator pages', async ({ page }) => {
        await signIn(page, 'student');
        await page.goto('/app/users');
        await expect(page).toHaveURL(/\/forbidden$/);
    });

    test('a supervisor cannot open another supervisor’s pages', async ({ page }) => {
        await signIn(page, 'academic');
        await page.goto('/app/reviews');
        await expect(page).toHaveURL(/\/forbidden$/);
    });

    test('the API refuses what the UI hides (403) and anonymous calls (401)', async ({
        page,
        request,
    }) => {
        const access = await signIn(page, 'student');
        const forbidden = await page.context().request.get('/api/v1/users/', {
            headers: { Authorization: `Bearer ${access}` },
        });
        expect(forbidden.status()).toBe(403);
        const anonymous = await request.get('/api/v1/placements/');
        expect(anonymous.status()).toBe(401);
    });

    test('the refresh token is invisible to JavaScript', async ({ page }) => {
        await signIn(page, 'student');
        await page.goto('/app/dashboard');
        const visible = await page.evaluate(() => document.cookie);
        expect(visible).not.toContain('siams-refresh');
        const cookies = await page.context().cookies();
        const refresh = cookies.find((cookie) => cookie.name === 'siams-refresh');
        expect(refresh?.httpOnly).toBe(true);
        expect(refresh?.sameSite).toBe('Strict');
    });
});
