import type {
  InstallmentInterval,
  MoneyDocument,
  ScheduledPayment,
} from "@/types/models";
import { formatDate, grandTotal, money } from "@/lib/data";
import { uuid } from "@/lib/uuid";

/* ─── Date arithmetic ─────────────────────────────────── */
export function addInterval(
  baseDate: string,
  interval: InstallmentInterval,
  n: number,
): string {
  const d = new Date(baseDate || new Date().toISOString().slice(0, 10));
  if (interval === "weekly") d.setDate(d.getDate() + 7 * n);
  else if (interval === "biweekly") d.setDate(d.getDate() + 14 * n);
  else d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

/* ─── Generate a full schedule ───────────────────────── */
export function buildSchedule(opts: {
  total: number;
  mode: "deposit-installments" | "deposit-only";
  depositPercent: number;
  installmentCount: number;
  interval: InstallmentInterval;
  startDate: string;
  balanceDate?: string;
}): ScheduledPayment[] {
  const total = Math.max(0, opts.total);
  const depositAmount = Math.round((total * opts.depositPercent) / 100);

  if (opts.mode === "deposit-only") {
    return [
      {
        id: uuid(),
        label: `Deposit (${opts.depositPercent}%)`,
        amount: depositAmount,
        dueDate: opts.startDate,
      },
      {
        id: uuid(),
        label: "Balance",
        amount: total - depositAmount,
        dueDate: opts.balanceDate ?? opts.startDate,
      },
    ];
  }

  const remaining = total - depositAmount;
  const baseInstall =
    Math.round((remaining / opts.installmentCount) * 100) / 100;
  const rows: ScheduledPayment[] = [
    {
      id: uuid(),
      label: `Deposit (${opts.depositPercent}%)`,
      amount: depositAmount,
      dueDate: opts.startDate,
    },
  ];
  for (let i = 0; i < opts.installmentCount; i++) {
    const amount =
      i === opts.installmentCount - 1
        ? Math.round(
            (remaining - baseInstall * (opts.installmentCount - 1)) * 100,
          ) / 100
        : baseInstall;
    rows.push({
      id: uuid(),
      label: `Payment ${i + 1} of ${opts.installmentCount}`,
      amount,
      dueDate: addInterval(opts.startDate, opts.interval, i + 1),
    });
  }
  return rows;
}

/* ─── Status helpers ──────────────────────────────────── */
export function installmentPaid(p: ScheduledPayment): boolean {
  return (p.paidAmount ?? 0) >= p.amount - 0.005;
}

export function installmentOverdue(
  p: ScheduledPayment,
  today = new Date(),
): boolean {
  if (installmentPaid(p)) return false;
  if (!p.dueDate) return false;
  return new Date(p.dueDate).getTime() < today.getTime();
}

/* ─── Summary ─────────────────────────────────────────── */
export function scheduleTotals(doc: MoneyDocument) {
  const schedule = doc.paymentSchedule ?? [];
  const total = grandTotal(doc);
  const paid = schedule.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
  const balance = Math.max(0, total - paid);

  const today = new Date();
  const dueNow = schedule
    .filter((p) => !installmentPaid(p) && new Date(p.dueDate) <= today)
    .reduce((s, p) => s + (p.amount - (p.paidAmount ?? 0)), 0);

  const nextUpcoming = schedule
    .filter((p) => !installmentPaid(p))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];

  return { total, paid, balance, dueNow, nextUpcoming };
}

/* ─── Build a Receipt from an installment ─────────────── */
export function buildReceiptFromInstallment(
  source: MoneyDocument,
  installment: ScheduledPayment,
  receiptNumber: string,
  brandProfileId?: string,
): MoneyDocument {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: uuid(),
    type: "Receipt",
    number: receiptNumber,
    contact: source.contact,
    contactId: source.contactId,
    contactEmail: source.contactEmail,
    contactAddress: source.contactAddress,
    contactPhone: source.contactPhone,
    date: today,
    dueDate: "",
    currency: source.currency,
    status: "Paid",
    notes: `Payment received for ${source.type} ${source.number} · ${installment.label}`,
    items: [
      {
        id: uuid(),
        description: `${installment.label} · ${source.type} ${source.number}`,
        quantity: 1,
        rate: installment.amount,
      },
    ],
    accent: source.accent,
    taxRate: 0,
    pageSize: source.pageSize,
    orientation: source.orientation,
    paidWatermark: true,
    amountPaid: installment.amount,
    linkedInvoiceId: source.id,
    brandProfileId: source.brandProfileId ?? brandProfileId,
  };
}

/* ─── Build a Payment Request from an installment ─────── */
export function buildPaymentRequestFromInstallment(
  source: MoneyDocument,
  installment: ScheduledPayment,
  requestNumber: string,
  brandProfileId?: string,
): MoneyDocument {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: uuid(),
    type: "Payment Request",
    number: requestNumber,
    contact: source.contact,
    contactId: source.contactId,
    contactEmail: source.contactEmail,
    contactAddress: source.contactAddress,
    contactPhone: source.contactPhone,
    date: today,
    dueDate: installment.dueDate,
    currency: source.currency,
    status: "Issued",
    notes: `This is a request for ${installment.label.toLowerCase()} of ${source.type} ${source.number}. Kindly pay ${money(installment.amount, source.currency)} by ${formatDate(installment.dueDate)}.`,
    items: [
      {
        id: uuid(),
        description: installment.label,
        quantity: 1,
        rate: installment.amount,
      },
    ],
    accent: source.accent,
    taxRate: 0,
    pageSize: source.pageSize,
    orientation: source.orientation,
    paidWatermark: false,
    linkedInvoiceId: source.id,
    targetInstallmentId: installment.id,
    brandProfileId: source.brandProfileId ?? brandProfileId,
  };
}

/* ─── Mark an installment paid on the source doc ─────── */
export function applyInstallmentPayment(
  source: MoneyDocument,
  installmentId: string,
  paidAmount: number,
  receiptId?: string,
): MoneyDocument {
  const today = new Date().toISOString();
  const schedule = (source.paymentSchedule ?? []).map((p) =>
    p.id === installmentId
      ? {
          ...p,
          paidAt: today,
          paidAmount,
          receiptId: receiptId ?? p.receiptId,
        }
      : p,
  );

  const allPaid = schedule.every((p) => installmentPaid(p));
  const anyPaid = schedule.some((p) => installmentPaid(p));

  return {
    ...source,
    paymentSchedule: schedule,
    status: allPaid ? "Paid" : anyPaid ? "Issued" : source.status,
    paidWatermark: allPaid ? true : source.paidWatermark,
  };
}
