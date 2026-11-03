import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/app";
import type { MoneyDocument } from "@/types/models";

export function useDebouncedDocumentSave(
  doc: MoneyDocument | null,
  delay = 250,
) {
  const updateDocument = useAppStore((s) => s.updateDocument);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const timer = useRef<number | null>(null);
  const lastSaved = useRef<string>(doc ? JSON.stringify(doc) : "");

  useEffect(() => {
    if (!doc) return;
    const current = JSON.stringify(doc);
    if (current === lastSaved.current) {
      setDirty(false);
      return;
    }
    setDirty(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        await updateDocument(doc);
        lastSaved.current = JSON.stringify(doc);
      } catch (error) {
        console.error("Could not save document:", error);
      } finally {
        setSaving(false);
        setDirty(false);
      }
    }, delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [doc, delay, updateDocument]);

  return { saving, dirty, saved: !dirty && !saving };
}
