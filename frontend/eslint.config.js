import js from '@eslint/js';
import globals from 'globals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const AXIOS = {
    name: 'axios',
    message:
        'Import axios only inside src/lib/api. Use get/post/patch/... from @/lib/api/endpoints.',
};
const NO_UI = ['@/components/*', '@/features/*', '@/app/*', '@/pages/*'];

const restrict = (patterns = [], withAxios = true) => [
    'error',
    { paths: withAxios ? [AXIOS] : [], patterns },
];

export default tseslint.config(
    {
        ignores: [
            'dist',
            'coverage',
            'playwright-report',
            'test-results',
            'node_modules',
            'src/components/ui',
            'src/hooks',
            'src/types/api.d.ts',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { ecmaVersion: 2022, globals: globals.browser },
        plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, 'jsx-a11y': jsxA11y },
        rules: {
            ...jsxA11y.configs.recommended.rules,
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
            'no-restricted-imports': restrict(),
            'no-restricted-syntax': [
                'error',
                {
                    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
                    message:
                        'dangerouslySetInnerHTML is forbidden (XSS). Render user text as plain text.',
                },
            ],
        },
    },
    {
        files: ['src/lib/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': restrict(
                NO_UI.map((g) => ({
                    group: [g],
                    message: 'lib must not depend on UI, features or app.',
                })),
            ),
        },
    },
    {
        files: ['src/lib/api/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': restrict(
                NO_UI.map((g) => ({
                    group: [g],
                    message: 'lib must not depend on UI, features or app.',
                })),
                false,
            ),
        },
    },
    {
        files: ['src/components/shared/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': restrict(
                ['@/features/*', '@/app/*', '@/pages/*'].map((g) => ({
                    group: [g],
                    message: 'Shared components must not import features, app or pages.',
                })),
            ),
        },
    },
    {
        files: ['src/features/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': restrict([
                {
                    group: ['@/features/*/*'],
                    message:
                        'Import another feature only through its index.ts (@/features/<name>).',
                },
                {
                    group: ['@/app/*', '@/pages/*'],
                    message: 'Features must not import app or pages.',
                },
            ]),
        },
    },
    {
        files: ['src/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
        rules: { 'no-restricted-imports': 'off', '@typescript-eslint/no-explicit-any': 'off' },
    },
);
