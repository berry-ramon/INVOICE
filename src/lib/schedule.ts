import type {
  DepositMode,
  InstallmentInterval,
  MoneyDocument,
  ScheduledPayment,
} from "@/types/models";
import { formatDate, grandTotal, money } from "@/lib/data";
import { uuid } from "@/lib/uuid";

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function normalizeLabel(label: string): string {
  return label.replace(/(\d+\.\d{2,})%/, (_, n) => {
    const rounded = Math.round(parseFloat(n) * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
  });
}

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

export function buildSchedule(opts: {
  total: number;
  mode: "deposit-installments" | "deposit-only";
  depositMode: DepositMode;
  depositPercent: number;
  depositAmount: number;
  installmentCount: number;
  interval: InstallmentInterval;
  startDate: string;
  balanceDate?: string;
}): ScheduledPayment[] {
  const total = Math.max(0, opts.total);

  let depositValue: number;
  let depositLabel: string;
  if (opts.depositMode === "fixed") {
    depositValue =
      Math.round(Math.min(Math.max(0, opts.depositAmount), total) * 100) / 100;
    depositLabel = "Deposit";
  } else {
    const pct = Math.round(opts.depositPercent * 100) / 100;
    depositValue = Math.round(((total * pct) / 100) * 100) / 100;
    depositLabel = `Deposit (${formatPct(pct)}%)`;
  }

  if (opts.mode === "deposit-only") {
    return [
      {
        id: uuid(),
        label: depositLabel,
        amount: depositValue,
        originalAmount: depositValue,
        dueDate: opts.startDate,
      },
      {
        id: uuid(),
        label: "Balance",
        amount: Math.max(0, total - depositValue),
        originalAmount: Math.max(0, total - depositValue),
        dueDate: opts.balanceDate ?? opts.startDate,
      },
    ];
  }

  const remaining = Math.max(0, total - depositValue);
  const baseInstall =
    Math.round((remaining / opts.installmentCount) * 100) / 100;
  const rows: ScheduledPayment[] = [
    {
      id: uuid(),
      label: depositLabel,
      amount: depositValue,
      originalAmount: depositValue,
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
      originalAmount: amount,
      dueDate: addInterval(opts.startDate, opts.interval, i + 1),
    });
  }
  return rows;
}

export function buildScheduleByAmount(opts: {
  total: number;
  depositMode: DepositMode;
  depositPercent: number;
  depositAmount: number;
  perPeriodAmount: number;
  interval: InstallmentInterval;
  startDate: string;
}): ScheduledPayment[] {
  const total = Math.max(0, opts.total);
  const per = Math.max(0, opts.perPeriodAmount);

  let depositValue: number;
  let depositLabel: string;
  if (opts.depositMode === "fixed") {
    depositValue =
      Math.round(Math.min(Math.max(0, opts.depositAmount), total) * 100) / 100;
    depositLabel = "Deposit";
  } else {
    const pct = Math.round(opts.depositPercent * 100) / 100;
    depositValue = Math.round(((total * pct) / 100) * 100) / 100;
    depositLabel = `Deposit (${formatPct(pct)}%)`;
  }

  const remaining = Math.max(0, total - depositValue);
  const rows: ScheduledPayment[] = [
    {
      id: uuid(),
      label: depositLabel,
      amount: depositValue,
      originalAmount: depositValue,
      dueDate: opts.startDate,
    },
  ];

  if (remaining <= 0 || per <= 0) return rows;

  const count = Math.ceil(remaining / per);
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast
      ? Math.round((remaining - per * (count - 1)) * 100) / 100
      : per;
    rows.push({
      id: uuid(),
      label: `Payment ${i + 1} of ${count}`,
      amount,
      originalAmount: amount,
      dueDate: addInterval(opts.startDate, opts.interval, i + 1),
    });
  }
  return rows;
}

export function rebalanceLastRow(
  rows: ScheduledPayment[],
  grandTotalValue: number,
): ScheduledPayment[] {
  if (rows.length < 2) return rows;
  const deposit = rows[0]?.amount ?? 0;
  const installmentsExceptLast = rows
    .slice(1, -1)
    .reduce((s, r) => s + r.amount, 0);
  const lastAmount = Math.max(
    0,
    Math.round((grandTotalValue - deposit - installmentsExceptLast) * 100) /
      100,
  );
  return [
    ...rows.slice(0, -1),
    { ...rows[rows.length - 1], amount: lastAmount },
  ];
}

export function settleAndRoll(
  rows: ScheduledPayment[],
  rowId: string,
  grandTotalValue: number,
): ScheduledPayment[] {
  const idx = rows.findIndex((r) => r.id === rowId);
  if (idx < 0 || idx === rows.length - 1) return rows;
  const row = rows[idx];
  const paid = row.paidAmount ?? 0;
  const shortfall = Math.max(0, row.amount - paid);
  if (shortfall <= 0.005) return rows;

  const shifted: ScheduledPayment[] = rows.map((r, i) => {
    if (i === idx) {
      return {
        ...r,
        amount: Math.round(paid * 100) / 100,
        paidAmount: Math.round(paid * 100) / 100,
        paidAt: r.paidAt ?? new Date().toISOString(),
      };
    }
    if (i === idx + 1) {
      return {
        ...r,
        amount: Math.round((r.amount + shortfall) * 100) / 100,
      };
    }
    return r;
  });

  return rebalanceLastRow(shifted, grandTotalValue);
}

export function outstandingOn(p: ScheduledPayment): number {
  return Math.max(0, p.amount - (p.paidAmount ?? 0));
}

export function installmentPaid(p: ScheduledPayment): boolean {
  return (p.paidAmount ?? 0) >= p.amount - 0.005;
}

export function installmentPartial(p: ScheduledPayment): boolean {
  const paid = p.paidAmount ?? 0;
  return paid > 0 && paid < p.amount - 0.005;
}

export function installmentOverdue(
  p: ScheduledPayment,
  today = new Date(),
): boolean {
  if (installmentPaid(p)) return false;
  if (!p.dueDate) return false;
  return new Date(p.dueDate).getTime() < today.getTime();
}

export function scheduleTotals(doc: MoneyDocument) {
  const schedule = doc.paymentSchedule ?? [];
  const total = grandTotal(doc);
  const paid = schedule.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
  const balance = Math.max(0, total - paid);

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();

  let overdue = 0;
  let upcoming = 0;
  let nextUpcoming: ScheduledPayment | undefined;

  for (const p of schedule) {
    if (installmentPaid(p)) continue;
    const outstanding = outstandingOn(p);
    const due = p.dueDate ? new Date(p.dueDate).getTime() : Infinity;
    if (due <= todayStart) {
      overdue += outstanding;
    } else {
      upcoming += outstanding;
      if (
        !nextUpcoming ||
        new Date(p.dueDate).getTime() < new Date(nextUpcoming.dueDate).getTime()
      ) {
        nextUpcoming = p;
      }
    }
  }

  return { total, paid, balance, overdue, upcoming, nextUpcoming };
}

export function buildReceiptFromInstallment(
  source: MoneyDocument,
  installment: ScheduledPayment,
  receiptNumber: string,
  opts?: { amount?: number; brandProfileId?: string; partial?: boolean },
): MoneyDocument {
  const today = new Date().toISOString().slice(0, 10);
  const amount = opts?.amount ?? installment.amount;
  const partial = opts?.partial ?? false;

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
    notes: partial
      ? `Part payment received for ${source.type} ${source.number} · ${installment.label}`
      : `Payment received for ${source.type} ${source.number} · ${installment.label}`,
    items: [
      {
        id: uuid(),
        description: `${partial ? "Part payment · " : ""}${
          installment.label
        } · ${source.type} ${source.number}`,
        quantity: 1,
        rate: amount,
      },
    ],
    accent: source.accent,
    taxRate: 0,
    pageSize: source.pageSize,
    orientation: source.orientation,
    paidWatermark: true,
    amountPaid: amount,
    linkedInvoiceId: source.id,
    brandProfileId: source.brandProfileId ?? opts?.brandProfileId,
  };
}

export function buildPaymentRequestFromInstallment(
  source: MoneyDocument,
  installment: ScheduledPayment,
  requestNumber: string,
  opts?: { amount?: number; brandProfileId?: string },
): MoneyDocument {
  const today = new Date().toISOString().slice(0, 10);
  const amount = opts?.amount ?? outstandingOn(installment);

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
    notes: `This is a request for ${installment.label.toLowerCase()} of ${
      source.type
    } ${source.number}. Kindly pay ${money(
      amount,
      source.currency,
    )} by ${formatDate(installment.dueDate)}.`,
    items: [
      {
        id: uuid(),
        description: installment.label,
        quantity: 1,
        rate: amount,
      },
    ],
    accent: source.accent,
    taxRate: 0,
    pageSize: source.pageSize,
    orientation: source.orientation,
    paidWatermark: false,
    linkedInvoiceId: source.id,
    targetInstallmentId: installment.id,
    brandProfileId: source.brandProfileId ?? opts?.brandProfileId,
  };
}

export function applyInstallmentPayment(
  source: MoneyDocument,
  installmentId: string,
  incrementAmount: number,
  receiptId?: string,
): MoneyDocument {
  const today = new Date().toISOString();
  const increment = Math.max(0, incrementAmount);

  const schedule = (source.paymentSchedule ?? []).map((p) => {
    if (p.id !== installmentId) return p;
    const nextPaid = Math.min(p.amount, (p.paidAmount ?? 0) + increment);
    const ids = p.receiptIds ?? (p.receiptId ? [p.receiptId] : []);
    const nextIds = receiptId ? [...ids, receiptId] : ids;
    return {
      ...p,
      paidAt: today,
      paidAmount: nextPaid,
      receiptId: receiptId ?? p.receiptId,
      receiptIds: nextIds,
    };
  });

  const allPaid = schedule.every((p) => installmentPaid(p));
  const anyPaid = schedule.some((p) => (p.paidAmount ?? 0) > 0);

  return {
    ...source,
    paymentSchedule: schedule,
    status: allPaid ? "Paid" : anyPaid ? "Issued" : source.status,
    paidWatermark: allPaid ? true : source.paidWatermark,
  };
}
