import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level crash guard. Shows a calm fallback instead of a white screen and
 * keeps the reload affordance obvious. Saved progress lives in IndexedDB and
 * survives the crash, which the copy reassures the user about.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Development-only diagnostics. The product ships no analytics (PRD §11).
    console.error('[PixelHaven] Unhandled UI error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="crash-screen" role="alert">
          <svg className="crash-screen__art" viewBox="0 0 16 16" aria-hidden="true">
            <rect width="16" height="16" fill="#f8f1e5" />
            <path d="M4 4h2v2H4zM10 4h2v2h-2zM5 10h6v2H5z" fill="#43364a" />
          </svg>
          <h1>Oh no — the colors spilled.</h1>
          <p>Something unexpected went wrong, but your saved progress is safe on this device.</p>
          <button type="button" className="btn btn--primary" onClick={this.handleReload}>
            Reload PixelHaven
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
