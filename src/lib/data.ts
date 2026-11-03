import type { AppSettings, BrandProfile, MoneyDocument } from "@/types/models";

export const total = (doc: MoneyDocument) =>
  doc.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.rate || 0),
    0,
  );

export const taxFor = (doc: MoneyDocument) => {
  const rate = doc.taxRate ?? 0;
  return (total(doc) * rate) / 100;
};

export const grandTotal = (doc: MoneyDocument) => total(doc) + taxFor(doc);

/* ─── Money already received ─────────────────────────── */
export const totalPaid = (doc: MoneyDocument): number => {
  if (doc.paymentSchedule?.length) {
    return doc.paymentSchedule.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
  }
  if (doc.type === "Receipt") {
    return doc.amountPaid ?? grandTotal(doc);
  }
  return doc.amountPaid ?? 0;
};

/* ─── What's still owed ──────────────────────────────── */
export const balanceDue = (doc: MoneyDocument): number =>
  Math.max(0, grandTotal(doc) - totalPaid(doc));

/* ─── Fully settled? ─────────────────────────────────── */
export const isFullyPaid = (doc: MoneyDocument): boolean => {
  const t = grandTotal(doc);
  return t > 0 && totalPaid(doc) >= t - 0.005;
};

export const money = (amount: number, currency?: string) => {
  if (!Number.isFinite(amount)) amount = 0;
  if (!currency) {
    return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
      amount,
    );
  }
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
      amount,
    );
  }
};

export const formatDate = (date?: string) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export const initials = (value?: string) => {
  if (!value) return "";
  return value
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export const brandFor = (
  doc: MoneyDocument | undefined,
  profiles: BrandProfile[],
): BrandProfile | undefined => {
  if (!doc) return profiles[0];
  if (doc.brandProfileId) {
    const found = profiles.find((p) => p.id === doc.brandProfileId);
    if (found) return found;
  }
  return profiles[0];
};

const prefixMap: Record<string, string> = {
  Invoice: "",
  Receipt: "RCP",
  Quotation: "QUO",
  Voucher: "VCH",
  "Payment Request": "PR",
};

export const nextDocumentNumber = (
  type: string,
  settings: AppSettings,
  existing: MoneyDocument[],
) => {
  const prefix =
    type === "Invoice"
      ? (settings.invoicePrefix ?? "INV")
      : (prefixMap[type] ?? type.slice(0, 3).toUpperCase());

  const matching = existing
    .filter((d) => d.number?.startsWith(prefix + "-"))
    .map((d) => parseInt(d.number.split("-").pop() ?? "0", 10))
    .filter((n) => Number.isFinite(n));

  const floor =
    type === "Invoice" && settings.nextInvoiceNumber
      ? settings.nextInvoiceNumber
      : 1;
  const next = Math.max(floor, ...matching, 0) + (matching.length ? 1 : 0);
  return `${prefix}-${String(next).padStart(4, "0")}`;
};
