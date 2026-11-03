import { create } from "zustand";
import { db, migrateLegacyLocalStorage } from "@/db/hatiri";
import type {
  AppSettings,
  Asset,
  BrandProfile,
  Contact,
  LibraryItem,
  MoneyDocument,
} from "@/types/models";

export type Theme = "light" | "dark" | "system";

interface AppState {
  documents: MoneyDocument[];
  contacts: Contact[];
  items: LibraryItem[];
  brandProfiles: BrandProfile[];
  assets: Asset[];
  settings: AppSettings;
  theme: Theme;
  hydrated: boolean;
  welcomeComplete: boolean;
  tipsSeen: string[];
  lastBackup?: string;
  sidebarCollapsed: boolean;
  createOpen: boolean;

  setCreateOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  completeWelcome: () => Promise<void>;
  replayWelcome: () => Promise<void>;
  markTipSeen: (id: string) => Promise<void>;
  skipAllTips: (ids: string[]) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;

  updateDocument: (doc: MoneyDocument) => Promise<void>;
  addDocument: (doc: MoneyDocument) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  updateContact: (contact: Contact) => Promise<void>;
  addContact: (contact: Contact) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  updateItem: (item: LibraryItem) => Promise<void>;
  addItem: (item: LibraryItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  updateBrandProfile: (profile: BrandProfile) => Promise<void>;
  addBrandProfile: (profile: BrandProfile) => Promise<void>;
  deleteBrandProfile: (id: string) => Promise<void>;

  addAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  markBackedUp: () => Promise<void>;
}

export const applyTheme = (theme: Theme) => {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#0E1512" : "#F5F4EF");
};

export const useAppStore = create<AppState>((set, get) => ({
  documents: [],
  contacts: [],
  items: [],
  brandProfiles: [],
  assets: [],
  settings: {},
  theme: "system",
  hydrated: false,
  welcomeComplete: false,
  tipsSeen: [],
  sidebarCollapsed: false,
  createOpen: false,

  setCreateOpen: (createOpen) => set({ createOpen }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => {
    localStorage.setItem("hatiri-theme", theme);
    applyTheme(theme);
    set({ theme });
  },
  completeWelcome: async () => {
    await db.meta.put({ key: "welcomeComplete", value: true });
    set({ welcomeComplete: true });
  },
  replayWelcome: async () => {
    await db.meta.put({ key: "welcomeComplete", value: false });
    await db.meta.put({ key: "tipsSeen", value: [] });
    set({ welcomeComplete: false, tipsSeen: [] });
  },
  markTipSeen: async (id) => {
    const next = [...new Set([...get().tipsSeen, id])];
    await db.meta.put({ key: "tipsSeen", value: next });
    set({ tipsSeen: next });
  },
  skipAllTips: async (ids) => {
    const next = [...new Set([...get().tipsSeen, ...ids])];
    await db.meta.put({ key: "tipsSeen", value: next });
    set({ tipsSeen: next });
  },
  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    await db.meta.put({ key: "settings", value: next });
    set({ settings: next });
  },

  updateDocument: async (doc) => {
    await db.documents.put(doc);
    set((s) => ({
      documents: s.documents.some((d) => d.id === doc.id)
        ? s.documents.map((d) => (d.id === doc.id ? doc : d))
        : [doc, ...s.documents],
    }));
  },
  addDocument: async (doc) => {
    await db.documents.add(doc);
    set((s) => ({ documents: [doc, ...s.documents] }));
  },
  deleteDocument: async (id) => {
    await db.documents.delete(id);
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
  },

  updateContact: async (contact) => {
    await db.contacts.put(contact);
    set((s) => ({
      contacts: s.contacts.map((c) => (c.id === contact.id ? contact : c)),
    }));
  },
  addContact: async (contact) => {
    await db.contacts.add(contact);
    set((s) => ({ contacts: [...s.contacts, contact] }));
  },
  deleteContact: async (id) => {
    await db.contacts.delete(id);
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
  },

  updateItem: async (item) => {
    await db.items.put(item);
    set((s) => ({
      items: s.items.map((i) => (i.id === item.id ? item : i)),
    }));
  },
  addItem: async (item) => {
    await db.items.add(item);
    set((s) => ({ items: [...s.items, item] }));
  },
  deleteItem: async (id) => {
    await db.items.delete(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  updateBrandProfile: async (profile) => {
    await db.brandProfiles.put(profile);
    set((s) => ({
      brandProfiles: s.brandProfiles.some((p) => p.id === profile.id)
        ? s.brandProfiles.map((p) => (p.id === profile.id ? profile : p))
        : [...s.brandProfiles, profile],
    }));
  },
  addBrandProfile: async (profile) => {
    await db.brandProfiles.add(profile);
    set((s) => ({ brandProfiles: [...s.brandProfiles, profile] }));
  },
  deleteBrandProfile: async (id) => {
    await db.brandProfiles.delete(id);
    set((s) => ({
      brandProfiles: s.brandProfiles.filter((p) => p.id !== id),
    }));
  },

  addAsset: async (asset) => {
    await db.assets.put(asset);
    set((s) => ({
      assets: [...s.assets.filter((a) => a.id !== asset.id), asset],
    }));
  },
  deleteAsset: async (id) => {
    await db.assets.delete(id);
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
  },

  markBackedUp: async () => {
    const lastBackup = new Date().toISOString();
    await db.meta.put({ key: "lastBackup", value: lastBackup });
    set({ lastBackup });
  },
}));

export async function hydrateAppStore() {
  try {
    await migrateLegacyLocalStorage();
    const [
      documents,
      contacts,
      items,
      brandProfiles,
      assets,
      welcome,
      backup,
      tips,
      settings,
    ] = await Promise.all([
      db.documents.toArray(),
      db.contacts.toArray(),
      db.items.toArray(),
      db.brandProfiles.toArray(),
      db.assets.toArray(),
      db.meta.get("welcomeComplete"),
      db.meta.get("lastBackup"),
      db.meta.get("tipsSeen"),
      db.meta.get("settings"),
    ]);
    const storedTheme = localStorage.getItem("hatiri-theme");
    const theme: Theme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : "system";
    applyTheme(theme);
    useAppStore.setState({
      documents,
      contacts,
      items,
      brandProfiles,
      assets,
      welcomeComplete: welcome?.value === true,
      lastBackup: typeof backup?.value === "string" ? backup.value : undefined,
      tipsSeen: Array.isArray(tips?.value) ? (tips.value as string[]) : [],
      settings:
        settings?.value && typeof settings.value === "object"
          ? (settings.value as AppSettings)
          : {},
      theme,
      hydrated: true,
    });
  } catch (error) {
    console.error("Hatiri could not open its local database.", error);
    useAppStore.setState({ hydrated: true });
  }
}
