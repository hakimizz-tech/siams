import { expect, type Page } from '@playwright/test';

/** Users created by `make seed` (backend/apps/*/seed.py). */
export const DEMO_PASSWORD = 'Password123!';
export const DEMO_USERS = {
  coordinator: 'coordinator@siams.local',
  academic: 'academic@siams.local',
  workplace: 'mentor@siams.local',
  student: 'student1@siams.local', // has an APPROVED placement
  student2: 'student2@siams.local', // has a SUBMITTED placement
} as const;

export type DemoUser = keyof typeof DEMO_USERS;

/**
 * Signs in through the API so the browser context holds the real HttpOnly refresh cookie.
 * The app then restores the session by itself (silent refresh), which is exactly what we test.
 */
export async function signIn(page: Page, who: DemoUser): Promise<string> {
  const response = await page.context().request.post('/api/v1/auth/login/', {
    data: { email: DEMO_USERS[who], password: DEMO_PASSWORD },
  });
  expect(response.ok(), `login as ${who}`).toBeTruthy();
  const body = (await response.json()) as { access: string };
  return body.access;
}
