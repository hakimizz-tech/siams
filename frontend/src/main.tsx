import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '@/styles/index.css';
import { ErrorBoundary } from '@/app/error-boundary';
import { Providers } from '@/app/providers';
import { createAppRouter } from '@/app/router';
import { getConfig, loadConfig } from '@/config/env';

const router = createAppRouter();

async function start() {
    await loadConfig(); // runtime config: one build serves every environment
    document.title = getConfig().appName;
    const root = document.getElementById('root');
    if (!root) throw new Error('Root element #root not found.');
    createRoot(root).render(
        <StrictMode>
            <ErrorBoundary>
                <Providers>
                    <RouterProvider router={router} />
                </Providers>
            </ErrorBoundary>
        </StrictMode>,
    );
}

void start();
