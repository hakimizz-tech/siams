import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn, type DemoUser } from '../fixtures/auth';

// Enable with E2E_A11Y=1 once the landing page and dashboards are built.
test.skip(!process.env.E2E_A11Y, 'Set E2E_A11Y=1 to run accessibility audits.');

test('landing page has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

for (const who of ['student', 'workplace', 'academic', 'coordinator'] as DemoUser[]) {
    test(`${who} dashboard has no accessibility violations`, async ({ page }) => {
        await signIn(page, who);
        await page.goto('/app/dashboard');
        await page.getByRole('navigation', { name: 'Main' }).waitFor();
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
}
