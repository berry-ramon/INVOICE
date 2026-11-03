import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Logo } from "@/components/Logo";
import { hydrateAppStore } from "@/store/app";

function Boot() {
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setSlow(true);
    }, 4000);

    Promise.race([
      hydrateAppStore(),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]).finally(() => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setReady(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] p-6 text-center">
        <div>
          <Logo />
          {slow && (
            <p className="mt-4 max-w-xs text-sm text-[var(--muted)]">
              Taking longer than usual. If nothing happens in a moment, try
              reloading.
            </p>
          )}
        </div>
      </div>
    );
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Boot />
    </ErrorBoundary>
  </React.StrictMode>,
);
