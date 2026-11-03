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

  /** Latest doc - captured at fire time, NOT at schedule time. */
  const latest = useRef<MoneyDocument | null>(doc);
  latest.current = doc;

  /** Signature of the last doc we successfully saved. */
  const lastSaved = useRef<string>(doc ? JSON.stringify(doc) : "");

  /** Timer handle. */
  const timer = useRef<number | null>(null);

  /** Public: flush immediately (used after markPaid / status changes). */
  const saveNow = async (override?: MoneyDocument) => {
    const target = override ?? latest.current;
    if (!target) return;
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const sig = JSON.stringify(target);
    if (sig === lastSaved.current) {
      setDirty(false);
      return;
    }
    setSaving(true);
    try {
      await updateDocument(target);
      lastSaved.current = sig;
    } catch (error) {
      console.error("Could not save document:", error);
    } finally {
      setSaving(false);
      setDirty(false);
    }
  };

  useEffect(() => {
    if (!doc) return;
    const sig = JSON.stringify(doc);
    if (sig === lastSaved.current) {
      setDirty(false);
      return;
    }
    setDirty(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      // Read the LATEST doc at fire time (prevents stale reverts).
      const target = latest.current;
      if (!target) return;
      const fireSig = JSON.stringify(target);
      if (fireSig === lastSaved.current) return;
      setSaving(true);
      updateDocument(target)
        .then(() => {
          lastSaved.current = fireSig;
        })
        .catch((error) => {
          console.error("Could not save document:", error);
        })
        .finally(() => {
          setSaving(false);
          setDirty(false);
        });
    }, delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [doc, delay, updateDocument]);

  return { saving, dirty, saved: !dirty && !saving, saveNow };
}
