import {
  Box,
  ChevronRight,
  Database,
  Download,
  Globe2,
  LayoutTemplate,
  Moon,
  Palette,
  ReceiptText,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, Input, PageTitle, Sheet } from "@/components/ui";
import { useAppStore } from "@/store/app";

export function Settings() {
  const {
    theme,
    setTheme,
    settings,
    updateSettings,
    brandProfiles,
    replayWelcome,
  } = useAppStore();
  const navigate = useNavigate();
  const [storage, setStorage] = useState("Calculating…");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    navigator.storage
      ?.estimate()
      .then(({ usage }) => {
        const mb = ((usage ?? 0) / 1024 / 1024).toFixed(2);
        setStorage(`${mb} MB used · Ready offline`);
      })
      .catch(() => setStorage("Ready offline"));
  }, []);

  const profile = brandProfiles[0];

  const openDefaults = () => {
    setDraft(settings);
    setEditing(true);
  };
  const saveDefaults = async () => {
    await updateSettings(draft);
    setEditing(false);
  };

  return (
    <div className="page settings-page">
      <PageTitle title="Settings" subtitle="Make Hatiri work your way" />

      <section className="settings-card profile-card">
        <div className="business-mark">
          {profile ? profile.name.slice(0, 2).toUpperCase() : "-"}
        </div>
        <div>
          <strong>{profile ? profile.name : "No brand profile yet"}</strong>
          <span>
            {profile
              ? "Default brand profile"
              : "Add one to appear on documents"}
          </span>
        </div>
        <button onClick={() => navigate("/brand")}>
          {profile ? "Edit" : "Set up"} <ChevronRight />
        </button>
      </section>

      <h2>Appearance</h2>
      <section className="settings-card">
        <div className="setting-row">
          <span className="setting-icon">
            <Palette />
          </span>
          <div>
            <strong>Theme</strong>
            <small>Choose how Hatiri looks</small>
          </div>
          <div className="theme-choice">
            <button
              className={theme === "light" ? "active" : ""}
              onClick={() => setTheme("light")}
            >
              <Sun /> Light
            </button>
            <button
              className={theme === "dark" ? "active" : ""}
              onClick={() => setTheme("dark")}
            >
              <Moon /> Dark
            </button>
            <button
              className={theme === "system" ? "active" : ""}
              onClick={() => setTheme("system")}
            >
              <Globe2 /> System
            </button>
          </div>
        </div>
      </section>

      <h2>Documents & data</h2>
      <section className="settings-card settings-list">
        <button onClick={() => navigate("/items")}>
          <span className="setting-icon">
            <Box />
          </span>
          <div>
            <strong>Items library</strong>
            <small>Reusable services, products and rates</small>
          </div>
          <ChevronRight />
        </button>
        <button onClick={() => navigate("/templates")}>
          <span className="setting-icon">
            <LayoutTemplate />
          </span>
          <div>
            <strong>Templates</strong>
            <small>Built-in and saved document layouts</small>
          </div>
          <ChevronRight />
        </button>
        <button onClick={() => navigate("/brand")}>
          <span className="setting-icon">
            <Palette />
          </span>
          <div>
            <strong>Brand & assets</strong>
            <small>Profiles, logos, signatures and stamps</small>
          </div>
          <ChevronRight />
        </button>
        <button onClick={openDefaults}>
          <span className="setting-icon">
            <ReceiptText />
          </span>
          <div>
            <strong>Numbering and defaults</strong>
            <small>Invoice numbers, currency, tax and terms</small>
          </div>
          <ChevronRight />
        </button>
        <button onClick={() => navigate("/backup")}>
          <span className="setting-icon">
            <Database />
          </span>
          <div>
            <strong>Storage and offline</strong>
            <small>{storage}</small>
          </div>
          <ChevronRight />
        </button>
        <button onClick={() => navigate("/backup")}>
          <span className="setting-icon">
            <Download />
          </span>
          <div>
            <strong>Backup and restore</strong>
            <small>Export a portable .hatiri backup</small>
          </div>
          <ChevronRight />
        </button>
        <button>
          <span className="setting-icon">
            <ShieldCheck />
          </span>
          <div>
            <strong>Privacy</strong>
            <small>Your data never leaves this device</small>
          </div>
          <ChevronRight />
        </button>
        <button onClick={replayWelcome}>
          <span className="setting-icon">✨</span>
          <div>
            <strong>Replay welcome tour</strong>
            <small>See the guided onboarding again</small>
          </div>
          <ChevronRight />
        </button>
      </section>

      <p className="about">
        Hatiri 1.0 · Every payment document, on your device.
      </p>

      <Sheet
        open={editing}
        title="Numbering & defaults"
        onClose={() => setEditing(false)}
      >
        <div className="form-grid">
          <label>
            Currency code
            <Input
              value={draft.currency ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, currency: e.target.value.toUpperCase() })
              }
              placeholder="e.g. KES, USD, EUR"
            />
          </label>
          <label>
            Default tax rate (%)
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.defaultTaxRate ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  defaultTaxRate: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              placeholder="Leave empty if none"
            />
          </label>
          <label>
            Invoice prefix
            <Input
              value={draft.invoicePrefix ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, invoicePrefix: e.target.value })
              }
              placeholder="INV"
            />
          </label>
          <label>
            Next invoice number
            <Input
              type="number"
              min="1"
              value={draft.nextInvoiceNumber ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  nextInvoiceNumber: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              placeholder="1"
            />
          </label>
          <label>
            Payment terms (days)
            <Input
              type="number"
              min="0"
              value={draft.paymentTermsDays ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  paymentTermsDays: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              placeholder="Leave empty for no due date"
            />
          </label>
          <label>
            Default accent colour
            <Input
              type="color"
              value={draft.defaultAccent ?? "#0B6B57"}
              onChange={(e) =>
                setDraft({ ...draft, defaultAccent: e.target.value })
              }
            />
          </label>
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button onClick={saveDefaults}>Save defaults</Button>
        </div>
      </Sheet>
    </div>
  );
}
