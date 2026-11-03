import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Hatiri crashed:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  hardReload = () => {
    if (
      confirm(
        "Reloading will keep all your saved documents. Any edits in progress on this screen will be lost. Continue?",
      )
    ) {
      location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] p-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-2xl font-black text-[var(--primary)]">
            !
          </div>
          <h1 className="m-0 text-2xl font-bold text-[var(--text)]">
            Something went wrong
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Your saved documents are safe. Try again, or reload the app.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={this.reset}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-semibold text-[var(--text)]"
            >
              Try again
            </button>
            <button
              onClick={this.hardReload}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 font-semibold text-[var(--on-primary)]"
            >
              Reload app
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 overflow-auto rounded-lg bg-black/5 p-3 text-left text-xs text-[var(--muted)]">
              {String(this.state.error?.stack ?? this.state.error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
