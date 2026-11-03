import {
  Box,
  Download,
  FileText,
  Home,
  LayoutTemplate,
  Menu,
  Palette,
  Plus,
  Search,
  Settings,
  SunMoon,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Logo } from "@/components/Logo";
import { Button, IconButton, Sheet } from "@/components/ui";
import { nextDocumentNumber } from "@/lib/data";
import { useAppStore } from "@/store/app";
import type { DocumentType } from "@/types/models";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/items", label: "Items", icon: Box },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/brand", label: "Brand & assets", icon: Palette },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    sidebarCollapsed,
    toggleSidebar,
    createOpen,
    setCreateOpen,
    theme,
    setTheme,
    addDocument,
    documents,
    settings,
    brandProfiles,
  } = useAppStore();
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const editor = location.pathname.startsWith("/editor/");

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    addEventListener("beforeinstallprompt", handler);
    return () => removeEventListener("beforeinstallprompt", handler);
  }, []);

  const create = (type: DocumentType) => {
    const id = crypto.randomUUID();
    const number = nextDocumentNumber(type, settings, documents);
    const today = new Date().toISOString().slice(0, 10);
    const dueDate =
      settings.paymentTermsDays && settings.paymentTermsDays > 0
        ? new Date(Date.now() + settings.paymentTermsDays * 86400000)
            .toISOString()
            .slice(0, 10)
        : "";
    addDocument({
      id,
      type,
      number,
      contact: "",
      date: today,
      dueDate,
      currency: settings.currency ?? "",
      status: type === "Receipt" ? "Paid" : "Draft",
      notes: settings.defaultNotes ?? "",
      items: [],
      accent: settings.defaultAccent ?? brandProfiles[0]?.accent ?? "",
      taxRate: settings.defaultTaxRate ?? undefined,
      pageSize: settings.defaultPageSize ?? "A4",
      orientation: settings.defaultOrientation ?? "portrait",
      brandProfileId: brandProfiles[0]?.id,
      paidWatermark: type === "Receipt" ? true : undefined,
    });
    setCreateOpen(false);
    navigate(`/editor/${id}`);
  };

  if (editor) return <Outlet />;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo compact={sidebarCollapsed} />
          <IconButton label="Collapse menu" onClick={toggleSidebar}>
            {sidebarCollapsed ? <Menu /> : <X />}
          </IconButton>
        </div>
        <Button className="new-document" onClick={() => setCreateOpen(true)}>
          <Plus size={19} />
          <span>New document</span>
        </Button>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="offline-card">
          <span className="status-dot" />
          <div>
            <strong>Ready offline</strong>
            <small>All changes saved</small>
          </div>
        </div>
      </aside>

      <header className="topbar">
        <Logo />
        <div className="global-search">
          <Search size={18} />
          <input
            aria-label="Search"
            placeholder="Search documents, contacts…"
          />
        </div>
        {installPrompt && (
          <Button
            variant="secondary"
            className="install-button"
            onClick={async () => {
              await installPrompt.prompt();
              setInstallPrompt(null);
            }}
          >
            <Download size={17} /> Install
          </Button>
        )}
        <IconButton
          label="Change theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <SunMoon />
        </IconButton>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {nav.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="nav-new" onClick={() => setCreateOpen(true)}>
          <Plus />
          <span>New</span>
        </button>
        {[nav[2], nav[nav.length - 1]].map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <Sheet
        open={createOpen}
        title="Create a document"
        onClose={() => setCreateOpen(false)}
      >
        <div className="type-grid">
          {(
            [
              "Invoice",
              "Receipt",
              "Quotation",
              "Voucher",
              "Payment Request",
            ] as DocumentType[]
          ).map((type) => (
            <button key={type} onClick={() => create(type)}>
              <FileText />
              <strong>{type}</strong>
              <span>
                {type === "Invoice"
                  ? "Request a payment"
                  : type === "Receipt"
                    ? "Confirm a payment"
                    : type === "Quotation"
                      ? "Share an estimate"
                      : type === "Voucher"
                        ? "Record a transaction"
                        : "Ask for a specific installment"}
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
