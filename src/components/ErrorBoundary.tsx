import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional label — helps identify which boundary caught the error in logs. */
  name?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches any uncaught render error in its subtree and shows a retry UI
 * instead of a blank white screen. Critical for the kitchen tablet during
 * live service — a stale component crash must not take the whole app down.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? "root"}]`, error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-lg text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-foreground mb-1">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-4">
            The page hit an unexpected error. Your data is safe — try again or reload the app.
          </p>
          <details className="text-xs text-muted-foreground/70 mb-4 text-left">
            <summary className="cursor-pointer hover:text-muted-foreground">Technical details</summary>
            <pre className="mt-2 p-2 bg-muted/40 rounded overflow-auto max-h-32 text-[10px]">
              {this.state.error.message}
            </pre>
          </details>
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="flex-1 rounded-xl bg-muted hover:bg-muted/70 px-4 py-2 text-sm font-medium transition-colors"
            >
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 rounded-xl bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
