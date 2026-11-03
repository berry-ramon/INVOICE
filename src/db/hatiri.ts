import Dexie, { type EntityTable } from "dexie";
import type {
  Asset,
  BrandProfile,
  Contact,
  LibraryItem,
  MoneyDocument,
} from "@/types/models";

interface MetaRecord {
  key: string;
  value: unknown;
}

class HatiriDatabase extends Dexie {
  documents!: EntityTable<MoneyDocument, "id">;
  contacts!: EntityTable<Contact, "id">;
  items!: EntityTable<LibraryItem, "id">;
  brandProfiles!: EntityTable<BrandProfile, "id">;
  assets!: EntityTable<Asset, "id">;
  meta!: EntityTable<MetaRecord, "key">;

  constructor() {
    super("hatiri");
    const stores = {
      documents: "id, type, status, date, contact",
      contacts: "id, name, company",
      items: "id, name, category",
      brandProfiles: "id, name",
      assets: "id, kind, name",
      meta: "key",
    };
    this.version(1).stores(stores);
    this.version(2)
      .stores(stores)
      .upgrade(async (transaction) => {
        const docs = transaction.table("documents");
        const contacts = transaction.table("contacts");
        // Remove documents that match the old demo seed exactly.
        await docs
          .where("id")
          .anyOf(["inv-1042", "inv-1041", "quo-207"])
          .delete();
        // Remove demo contacts by ID only if the company name also matches.
        const demoCompanies = [
          "Amani Coffee Co.",
          "Kipepeo Studio",
          "Nuru Foods",
        ];
        await contacts
          .where("id")
          .anyOf(["1", "2", "3"])
          .and((c) => demoCompanies.includes((c as Contact).company))
          .delete();
      });
  }
}

export const db = new HatiriDatabase();

export async function migrateLegacyLocalStorage() {
  const done = await db.meta.get("legacy-cleanup-v2");
  if (done) return;
  const raw = localStorage.getItem("hatiri-store");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        state?: {
          documents?: MoneyDocument[];
          contacts?: Contact[];
          theme?: string;
        };
      };
      // Only migrate records that don't look like demo data.
      const badDocIds = ["inv-1042", "inv-1041", "quo-207"];
      const badContactIds = ["1", "2", "3"];
      const documents = (parsed.state?.documents ?? []).filter(
        (d) => !badDocIds.includes(d.id),
      );
      const contacts = (parsed.state?.contacts ?? []).filter(
        (c) => !badContactIds.includes(c.id),
      );
      if (documents.length) await db.documents.bulkPut(documents);
      if (contacts.length) await db.contacts.bulkPut(contacts);
      if (parsed.state?.theme && !localStorage.getItem("hatiri-theme")) {
        localStorage.setItem("hatiri-theme", parsed.state.theme);
      }
      localStorage.removeItem("hatiri-store");
    } catch {
      // Leave unparseable legacy value untouched rather than risk user data.
    }
  }
  await db.meta.put({ key: "legacy-cleanup-v2", value: true });
}
