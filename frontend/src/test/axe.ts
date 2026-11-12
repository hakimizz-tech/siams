import { axe } from 'vitest-axe';
import { expect } from 'vitest';

/** Fails the test listing every accessibility violation axe finds in `container`. */
export async function expectNoA11yViolations(container: Element): Promise<void> {
    const results = await axe(container);
    const summary = results.violations.map((v) => `${v.id}: ${v.help}`);
    expect(summary).toEqual([]);
}
