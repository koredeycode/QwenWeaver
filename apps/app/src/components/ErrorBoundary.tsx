import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-lg">
            <div className="mb-4 text-6xl">⚠️</div>
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Something went wrong</h1>
            <p className="mb-6 text-sm text-gray-500">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
