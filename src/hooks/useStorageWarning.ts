import { useEffect, useState } from "react";

export function useStorageWarning() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { usage, quota } = await navigator.storage.estimate();
        if (cancelled) return;
        if (usage && quota) setPercent((usage / quota) * 100);
      } catch {
        // ignore — some browsers throw if not HTTPS
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return percent;
}
