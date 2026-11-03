import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface Options {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(opts: Options) => Promise<boolean>>(
  async () => false,
);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: Options) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  }, []);

  const done = (v: boolean) => {
    resolver?.(v);
    setOpts(null);
    setResolver(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[300] grid place-items-center bg-black/40 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && done(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="m-0 text-lg font-bold text-[var(--text)]">
              {opts.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {opts.message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => done(false)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)]"
              >
                {opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={() => done(true)}
                className={
                  opts.danger
                    ? "rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--on-primary)]"
                }
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
