export type DocumentStatus = "Draft" | "Issued" | "Paid" | "Overdue";
export type DocumentType =
  | "Invoice"
  | "Receipt"
  | "Quotation"
  | "Voucher"
  | "Payment Request";
export type PageSize = "A4" | "A5" | "LETTER" | "LEGAL";
export type Orientation = "portrait" | "landscape";
export type ScheduleMode =
  | "full"
  | "deposit-installments"
  | "deposit-only"
  | "custom";
export type InstallmentInterval = "weekly" | "biweekly" | "monthly";
export type DepositMode = "percent" | "fixed";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate?: number;
}

export interface ScheduledPayment {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  paidAmount?: number;
  note?: string;
  receiptId?: string;
  receiptIds?: string[];
  paymentRequestId?: string;
}

export interface MoneyDocument {
  id: string;
  type: DocumentType;
  number: string;
  contact: string;
  contactId?: string;
  contactAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  date: string;
  dueDate: string;
  currency: string;
  status: DocumentStatus;
  notes: string;
  items: LineItem[];
  accent: string;
  taxRate?: number;
  pageSize?: PageSize;
  orientation?: Orientation;
  blockOrder?: string[];
  hiddenBlocks?: string[];
  logoWidthMm?: number;
  signatureWidthMm?: number;
  sealWidthMm?: number;
  elementOffsets?: Record<string, { x: number; y: number }>;
  paidWatermark?: boolean;
  amountPaid?: number;

  paymentSchedule?: ScheduledPayment[];
  scheduleMode?: ScheduleMode;
  depositMode?: DepositMode;
  depositPercent?: number;
  depositAmount?: number;
  installmentCount?: number;
  installmentInterval?: InstallmentInterval;

  linkedInvoiceId?: string;
  targetInstallmentId?: string;

  brandProfileId?: string;
  templateId?: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
}

export interface LibraryItem {
  id: string;
  name: string;
  description: string;
  unit: string;
  rate: number;
  taxRate?: number;
  category: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  address: string;
  taxPin: string;
  paymentDetails: string;
  email: string;
  phone: string;
  accent: string;
  logoAssetId?: string;
  signatureAssetId?: string;
  stampAssetId?: string;
}

export interface Asset {
  id: string;
  name: string;
  kind: "logo" | "signature" | "stamp" | "image";
  dataUrl: string;
  width: number;
  height: number;
}

export interface AppSettings {
  currency?: string;
  defaultTaxRate?: number;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  paymentTermsDays?: number;
  defaultNotes?: string;
  defaultAccent?: string;
  defaultPageSize?: PageSize;
  defaultOrientation?: Orientation;
}
