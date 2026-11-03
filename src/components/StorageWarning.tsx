import { useStorageWarning } from "@/hooks/useStorageWarning";

export function StorageWarning() {
  const percent = useStorageWarning();
  if (percent <= 80) return null;

  return (
    <div className="fixed left-3 right-3 top-3 z-40 mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-lg">
      <strong className="block">Storage is almost full</strong>
      <span>
        You've used {Math.round(percent)}% of your browser storage. Back up now
        and delete old documents to keep saving.
      </span>
    </div>
  );
}
