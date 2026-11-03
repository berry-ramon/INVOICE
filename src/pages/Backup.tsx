import { Download, HardDrive, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, PageTitle } from "@/components/ui";
import { useAppStore } from "@/store/app";
import type {
  MoneyDocument,
  Contact,
  LibraryItem,
  BrandProfile,
  Asset,
  AppSettings,
} from "@/types/models";

interface BackupFile {
  version: 1;
  exportedAt: string;
  documents: MoneyDocument[];
  contacts: Contact[];
  items: LibraryItem[];
  brandProfiles: BrandProfile[];
  assets: Asset[];
  settings: AppSettings;
}

export function Backup() {
  const store = useAppStore();
  const [usage, setUsage] = useState<{ used: number; total: number } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.estimate().then(({ usage, quota }) => {
      setUsage({ used: usage ?? 0, total: quota ?? 0 });
    });
  }, []);

  const download = () => {
    const payload: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      documents: store.documents,
      contacts: store.contacts,
      items: store.items,
      brandProfiles: store.brandProfiles,
      assets: store.assets,
      settings: store.settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hatiri-backup-${new Date().toISOString().slice(0, 10)}.hatiri`;
    link.click();
    URL.revokeObjectURL(link.href);
    store.markBackedUp();
  };

  const restore = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupFile;
      if (
        !confirm(
          `Restore ${data.documents?.length ?? 0} documents and ${data.contacts?.length ?? 0} contacts? This merges with your current data.`,
        )
      )
        return;
      for (const doc of data.documents ?? []) await store.updateDocument(doc);
      for (const c of data.contacts ?? [])
        await store.addContact(c).catch(() => {});
      for (const i of data.items ?? []) await store.addItem(i).catch(() => {});
      for (const p of data.brandProfiles ?? [])
        await store.addBrandProfile(p).catch(() => {});
      for (const a of data.assets ?? []) await store.addAsset(a);
      if (data.settings) await store.updateSettings(data.settings);
      alert("Restore complete.");
    } catch (e) {
      alert("That file could not be read as a Hatiri backup.");
    }
  };

  const used = usage ? (usage.used / 1024 / 1024).toFixed(2) : "…";
  const total = usage ? (usage.total / 1024 / 1024 / 1024).toFixed(1) : "…";
  const percent =
    usage && usage.total ? Math.min(100, (usage.used / usage.total) * 100) : 0;

  return (
    <div className="page backup-page">
      <PageTitle
        title="Backup & restore"
        subtitle="Keep a portable copy of everything in Hatiri"
      />

      <section className="backup-hero">
        <span>
          <ShieldCheck />
        </span>
        <h2>Your data belongs to you</h2>
        <p>
          Documents, contacts, settings and images are stored only on this
          device. Make a backup you can keep anywhere.
        </p>
        <Button onClick={download}>
          <Download /> Download .hatiri backup
        </Button>
      </section>

      <section className="backup-options">
        <article>
          <HardDrive />
          <div>
            <strong>Local storage</strong>
            <span>
              {used} MB used of approx. {total} GB
            </span>
            <div className="storage-bar">
              <i style={{ width: `${percent}%` }} />
            </div>
          </div>
        </article>
        <article>
          <Upload />
          <div>
            <strong>Restore a backup</strong>
            <span>Merges with current data.</span>
          </div>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Choose file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".hatiri,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) restore(f);
              e.target.value = "";
            }}
          />
        </article>
      </section>
    </div>
  );
}
