import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

/** Minimal fallback. Replace by building pages/errors/server-error and rendering it here. */
function Fallback({ message }: { message: string }) {
    return (
        <div role="alert" className="p-6">
            <h1 className="text-xl">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <button
                type="button"
                className="mt-4 underline"
                onClick={() => window.location.reload()}
            >
                Reload the page
            </button>
        </div>
    );
}

interface BoundaryState {
    error: Error | null;
}

/** Global boundary: a render crash never shows a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
    state: BoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): BoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(error, info.componentStack);
    }

    render() {
        if (this.state.error) return <Fallback message={this.state.error.message} />;
        return this.props.children;
    }
}

/** Route-level errorElement. */
export function RouteError() {
    const error = useRouteError();
    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';
    return <Fallback message={message} />;
}
