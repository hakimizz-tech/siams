import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';

type PageModule = { default: ComponentType };

const modules = import.meta.glob<PageModule>([
    '/src/features/*/pages/*.tsx',
    '/src/pages/**/*.tsx',
    '!/src/**/*.test.tsx',
]);

/** Placeholder shown until the page file exists. Replace by creating the page. */
export function ComingSoon({ name }: { name: string }) {
    return (
        <div role="status" className="p-6">
            <p className="text-sm text-muted-foreground">
                Page not built yet: <code>{name}</code>
            </p>
        </div>
    );
}

export const hasPage = (key: string): boolean => `/src/${key}.tsx` in modules;

/** Lazy route module: loads src/<key>.tsx if it exists, otherwise the placeholder. */
export function lazyPage(key: string): NonNullable<RouteObject['lazy']> {
    return async () => {
        const load = modules[`/src/${key}.tsx`];
        if (!load) return { Component: () => <ComingSoon name={key} /> };
        const module = await load();
        return { Component: module.default };
    };
}
