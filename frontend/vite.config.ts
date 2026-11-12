import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    define: { __APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? 'dev') },
    server: {
        host: true,
        port: 5173,
        allowedHosts: true, // dev only: the Host header may be "nginx" or "frontend"
        watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
        hmr: { clientPort: Number(process.env.VITE_HMR_CLIENT_PORT ?? 80) },
        proxy: {
            // only used when Vite is opened directly on :5173 (normally Nginx routes /api)
            '/api': {
                target: process.env.API_PROXY_TARGET ?? 'http://backend:8000',
                changeOrigin: false,
            },
        },
    },
    build: { sourcemap: 'hidden', target: 'es2022' },
    test: {
        environment: 'jsdom',
        environmentOptions: { jsdom: { url: 'http://localhost' } },
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', 'e2e', 'dist'],
        css: false,
        coverage: {
            provider: 'v8',
            include: ['src/lib/**', 'src/config/**'],
            exclude: ['**/*.test.{ts,tsx}', 'src/test/**', 'src/types/**'],
            thresholds: { lines: 70, statements: 70, functions: 65, branches: 60 },
        },
    },
});
