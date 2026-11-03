import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export function UpdateToast() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [updateSW, setUpdateSW] = useState<
    ((reload?: boolean) => Promise<void>) | null
  >(null);

  useEffect(() => {
    const updater = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {},
    });
    setUpdateSW(() => updater);

    const on = () => setOffline(false);
    const off = () => setOffline(true);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);

  if (!needRefresh && !offline) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
      <div className="flex-1 text-sm">
        <strong className="block text-[var(--text)]">
          {needRefresh ? "A new version is ready" : "You're offline"}
        </strong>
        <span className="text-[var(--muted)]">
          {needRefresh
            ? "Reload to update Hatiri."
            : "Hatiri keeps working. Changes are saved on this device."}
        </span>
      </div>
      {needRefresh && (
        <button
          onClick={() => updateSW?.(true)}
          className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-semibold text-[var(--on-primary)]"
        >
          Update
        </button>
      )}
    </div>
  );
}
