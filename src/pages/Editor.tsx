import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  FilePlus2,
  GripVertical,
  Minus,
  Palette,
  Pencil,
  Plus,
  Receipt as ReceiptIcon,
  Redo2,
  RotateCcw,
  Send,
  Settings2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Button, IconButton, Sheet } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { ImageImporter } from "@/features/assets/ImageImporter";
import { DocumentPage } from "@/features/workspace/DocumentPage";
import { downloadDocumentPdf, PdfExportError } from "@/features/pdf/export";
import { Viewport } from "@/features/workspace/Viewport";
import { useDebouncedDocumentSave } from "@/hooks/useDebouncedSave";
import {
  formatDate,
  grandTotal,
  money,
  nextDocumentNumber,
  taxFor,
  total,
} from "@/lib/data";
import {
  applyInstallmentPayment,
  buildPaymentRequestFromInstallment,
  buildReceiptFromInstallment,
  buildSchedule,
  buildScheduleByAmount,
  installmentOverdue,
  installmentPaid,
  installmentPartial,
  normalizeLabel,
  outstandingOn,
  rebalanceLastRow,
  scheduleTotals,
  settleAndRoll,
} from "@/lib/schedule";
import { uuid } from "@/lib/uuid";
import { useAppStore } from "@/store/app";
import type {
  Asset,
  BrandProfile,
  DepositMode,
  DocumentType,
  InstallmentInterval,
  MoneyDocument,
  Orientation,
  PageSize,
  ScheduleMode,
  ScheduledPayment,
} from "@/types/models";

const BLOCKS = [
  { id: "header", label: "Logo & header" },
  { id: "address", label: "Client & dates" },
  { id: "items", label: "Items table" },
  { id: "schedule", label: "Payment schedule" },
  { id: "totals", label: "Totals & payment" },
  { id: "notes", label: "Notes" },
  { id: "footer", label: "Footer & seal" },
];

const BLOCK_ELEMENTS: Record<string, string[]> = {
  header: [
    "logo",
    "brandName",
    "brandAddress",
    "brandEmail",
    "brandPhone",
    "invoiceLabelType",
    "invoiceLabelNumber",
  ],
  address: [
    "contactName",
    "contactAddress",
    "contactEmail",
    "contactPhone",
    "issueDate",
    "dueDate",
  ],
  items: [],
  schedule: [],
  totals: ["paymentDetails", "signature", "totalsList"],
  notes: ["notesText"],
  footer: ["footerLine", "footerName", "footerEmail", "seal"],
};

export function Editor() {
  const { id } = useParams();
  const doc = useAppStore((s) => s.documents.find((d) => d.id === id));

  if (!doc) return <Navigate to="/documents" replace />;
  return <EditorInner key={doc.id} initial={doc} />;
}

function EditorInner({ initial }: { initial: MoneyDocument }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const {
    brandProfiles,
    assets,
    documents,
    settings,
    deleteDocument,
    items: libraryItems,
    addAsset,
    updateBrandProfile,
    updateDocument,
    addDocument,
  } = useAppStore();

  const paperRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<MoneyDocument>(initial);
  const [history, setHistory] = useState<MoneyDocument[]>([]);
  const [future, setFuture] = useState<MoneyDocument[]>([]);
  const { saved, dirty, saveNow } = useDebouncedDocumentSave(draft);

  const [zoom, setZoom] = useState(0.72);
  const [selected, setSelected] = useState<string>();
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [exporting, setExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showBlocks, setShowBlocks] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [showPage, setShowPage] = useState(false);
  const [replaceKind, setReplaceKind] = useState<
    "logo" | "signature" | "seal" | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<ScheduleMode>(
    draft.scheduleMode ?? "deposit-installments",
  );
  const [formDepositMode, setFormDepositMode] = useState<DepositMode>(
    draft.depositMode ?? "percent",
  );
  const [formDeposit, setFormDeposit] = useState(draft.depositPercent ?? 30);
  const [formDepositAmount, setFormDepositAmount] = useState(
    draft.depositAmount ?? 0,
  );
  const [formCount, setFormCount] = useState(draft.installmentCount ?? 3);
  const [formPerPeriod, setFormPerPeriod] = useState(
    draft.perPeriodAmount ?? 0,
  );
  const [formScheduleKind, setFormScheduleKind] = useState<
    "count" | "per-period"
  >(draft.scheduleMode === "deposit-per-period" ? "per-period" : "count");
  const [formInterval, setFormInterval] = useState<InstallmentInterval>(
    draft.installmentInterval ?? "monthly",
  );
  const [formStart, setFormStart] = useState(
    draft.date || new Date().toISOString().slice(0, 10),
  );
  const [formBalanceDate, setFormBalanceDate] = useState(
    draft.dueDate || new Date().toISOString().slice(0, 10),
  );

  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [recordAmount, setRecordAmount] = useState("");

  const brand = brandProfiles[0];
  const logo = assets.find((a) => a.id === brand?.logoAssetId);
  const signature = assets.find((a) => a.id === brand?.signatureAssetId);
  const seal = assets.find((a) => a.id === brand?.stampAssetId);

  const linkedInvoice = draft.linkedInvoiceId
    ? documents.find((d) => d.id === draft.linkedInvoiceId)
    : undefined;

  const canHaveSchedule =
    draft.type === "Invoice" || draft.type === "Quotation";

  useEffect(() => {
    const fresh = useAppStore
      .getState()
      .documents.find((d) => d.id === initial.id);
    if (!fresh) return;
    const storeSig = (fresh.paymentSchedule ?? [])
      .map((p) => `${p.id}:${p.paidAmount ?? 0}`)
      .join(",");
    const draftSig = (draft.paymentSchedule ?? [])
      .map((p) => `${p.id}:${p.paidAmount ?? 0}`)
      .join(",");
    if (storeSig !== draftSig) setDraft(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  const patch = (next: Partial<MoneyDocument>) => {
    setHistory((h) => [...h.slice(-19), draft]);
    setFuture([]);
    setDraft((d) => ({ ...d, ...next }));
  };

  const patchBrand = (next: Partial<BrandProfile>) => {
    if (!brand) return;
    updateBrandProfile({ ...brand, ...next });
  };

  const updateRow = (id: string, next: Partial<ScheduledPayment>) => {
    if (!draft.paymentSchedule) return;
    const updated = draft.paymentSchedule.map((p) =>
      p.id === id ? { ...p, ...next } : p,
    );

    const involvesAmount = "amount" in next;
    const isLastRow = updated[updated.length - 1]?.id === id;
    const final =
      involvesAmount && !isLastRow && updated.length >= 2
        ? rebalanceLastRow(updated, grandTotal(draft))
        : updated;

    patch({ paymentSchedule: final });
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [draft, ...f].slice(0, 20));
    setDraft(prev);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, draft].slice(-20));
    setDraft(next);
  };

  const resetAllPositions = () => patch({ elementOffsets: {} });

  const resetSelectedOffsets = () => {
    if (!selected) return;
    const keys = BLOCK_ELEMENTS[selected] ?? [];
    const offsets = { ...(draft.elementOffsets ?? {}) };
    let changed = false;
    for (const k of keys) {
      if (offsets[k]) {
        delete offsets[k];
        changed = true;
      }
    }
    if (changed) patch({ elementOffsets: offsets });
  };

  const handlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  handlerRef.current = (e) => {
    const target = e.target as HTMLElement;
    const typing =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;
    const mod = e.metaKey || e.ctrlKey;

    if (e.key === "Escape") {
      if (typing) return;
      if (selected) setSelected(undefined);
      return;
    }
    if (typing) return;

    if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (
      mod &&
      (e.key.toLowerCase() === "y" ||
        (e.key.toLowerCase() === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void saveNow();
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selected) {
      e.preventDefault();
      resetSelectedOffsets();
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handlerRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const download = async () => {
    if (!paperRef.current) return;
    setExporting(true);
    setPdfError(null);
    const originalMode = mode;
    setMode("preview");
    await new Promise((r) => setTimeout(r, 80));
    try {
      await downloadDocumentPdf(paperRef.current, draft);
    } catch (e) {
      setPdfError(
        e instanceof PdfExportError
          ? e.message
          : "PDF export failed. Please try again.",
      );
    } finally {
      setExporting(false);
      setMode(originalMode);
    }
  };

  const addLineItem = () =>
    patch({
      items: [
        ...draft.items,
        { id: uuid(), description: "", quantity: 1, rate: 0 },
      ],
    });

  const updateLineItem = (
    itemId: string,
    next: Partial<MoneyDocument["items"][number]>,
  ) =>
    patch({
      items: draft.items.map((i) => (i.id === itemId ? { ...i, ...next } : i)),
    });

  const removeLineItem = (itemId: string) =>
    patch({ items: draft.items.filter((i) => i.id !== itemId) });

  const generateSchedule = () => {
    const totalAmount = grandTotal(draft);
    if (totalAmount <= 0) {
      setToast("Add items first — the schedule needs a total.");
      return;
    }
    if (formMode === "full") {
      patch({ paymentSchedule: undefined, scheduleMode: "full" });
      return;
    }

    if (formScheduleKind === "per-period") {
      if (formPerPeriod <= 0) {
        setToast("Set an amount per period (e.g. 2000).");
        return;
      }
      const sched = buildScheduleByAmount({
        total: totalAmount,
        depositMode: formDepositMode,
        depositPercent: formDeposit,
        depositAmount: formDepositAmount,
        perPeriodAmount: formPerPeriod,
        interval: formInterval,
        startDate: formStart,
      });
      patch({
        paymentSchedule: sched,
        scheduleMode: "deposit-per-period",
        depositMode: formDepositMode,
        depositPercent: formDepositMode === "percent" ? formDeposit : undefined,
        depositAmount:
          formDepositMode === "fixed" ? formDepositAmount : undefined,
        perPeriodAmount: formPerPeriod,
        installmentInterval: formInterval,
        installmentCount: sched.length - 1,
      });
      setToast("Per-period schedule created.");
      return;
    }

    const sched = buildSchedule({
      total: totalAmount,
      mode:
        formMode === "deposit-only" ? "deposit-only" : "deposit-installments",
      depositMode: formDepositMode,
      depositPercent: formDeposit,
      depositAmount: formDepositAmount,
      installmentCount: formCount,
      interval: formInterval,
      startDate: formStart,
      balanceDate: formBalanceDate,
    });
    patch({
      paymentSchedule: sched,
      scheduleMode: formMode,
      depositMode: formDepositMode,
      depositPercent: formDepositMode === "percent" ? formDeposit : undefined,
      depositAmount:
        formDepositMode === "fixed" ? formDepositAmount : undefined,
      installmentCount: formCount,
      installmentInterval: formInterval,
    });
    setToast("Schedule created.");
  };

  const clearSchedule = () => {
    patch({
      paymentSchedule: undefined,
      scheduleMode: undefined,
      depositMode: undefined,
      depositPercent: undefined,
      depositAmount: undefined,
      installmentCount: undefined,
      perPeriodAmount: undefined,
      installmentInterval: undefined,
    });
  };

  const addCustomRow = () => {
    const rows = draft.paymentSchedule ?? [];
    patch({
      paymentSchedule: [
        ...rows,
        {
          id: uuid(),
          label: `Payment ${rows.length + 1}`,
          amount: 0,
          dueDate: new Date().toISOString().slice(0, 10),
        },
      ],
    });
  };

  const removeRow = async (id: string) => {
    const row = draft.paymentSchedule?.find((p) => p.id === id);
    if (!row) return;
    if ((row.paidAmount ?? 0) > 0) {
      setToast("Cannot remove a row that already has payments recorded.");
      return;
    }
    const ok = await confirm({
      title: "Remove this installment?",
      message: `${row.label} · ${money(row.amount, draft.currency)}`,
      danger: true,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    const filtered = (draft.paymentSchedule ?? []).filter((p) => p.id !== id);
    patch({
      paymentSchedule: rebalanceLastRow(filtered, grandTotal(draft)),
    });
  };

  const startRecording = (row: ScheduledPayment) => {
    setRecordingFor(row.id);
    setRecordAmount(String(outstandingOn(row)));
  };

  const confirmRecording = async (rowId: string) => {
    const fresh = useAppStore
      .getState()
      .documents.find((d) => d.id === draft.id);
    if (!fresh?.paymentSchedule) return;
    const row = fresh.paymentSchedule.find((p) => p.id === rowId);
    if (!row) return;

    const requested = Number(recordAmount);
    if (!Number.isFinite(requested) || requested <= 0) return;

    const cap = outstandingOn(row);
    const amount = Math.min(requested, cap);
    const isPartial = amount < row.amount - 0.005;

    const receiptNumber = nextDocumentNumber("Receipt", settings, documents);
    const receipt = buildReceiptFromInstallment(fresh, row, receiptNumber, {
      amount,
      partial: (row.paidAmount ?? 0) > 0 || isPartial,
      brandProfileId: brand?.id,
    });

    const nextInvoice = applyInstallmentPayment(
      fresh,
      row.id,
      amount,
      receipt.id,
    );

    try {
      await updateDocument(nextInvoice);
      await addDocument(receipt);
      setDraft(nextInvoice);
      void saveNow(nextInvoice);
      setRecordingFor(null);
      setRecordAmount("");
      setToast(
        `Receipt ${receipt.number} · ${money(amount, fresh.currency)} recorded.`,
      );
    } catch (error) {
      console.error("Could not save payment:", error);
      setToast("Save failed. Please try again.");
    }
  };

  const markFullyPaid = async (rowId: string) => {
    const fresh = useAppStore
      .getState()
      .documents.find((d) => d.id === draft.id);
    if (!fresh?.paymentSchedule) return;
    const row = fresh.paymentSchedule.find((p) => p.id === rowId);
    if (!row) return;
    const outstanding = outstandingOn(row);
    if (outstanding <= 0) return;

    setRecordingFor(null);
    setRecordAmount(String(outstanding));

    const ok = await confirm({
      title: "Mark fully paid?",
      message: `${row.label} · recording ${money(
        outstanding,
        fresh.currency,
      )}. A receipt will be created.`,
      confirmLabel: "Mark paid",
    });
    if (!ok) return;

    const receiptNumber = nextDocumentNumber("Receipt", settings, documents);
    const receipt = buildReceiptFromInstallment(fresh, row, receiptNumber, {
      amount: outstanding,
      partial: (row.paidAmount ?? 0) > 0,
      brandProfileId: brand?.id,
    });

    const nextInvoice = applyInstallmentPayment(
      fresh,
      row.id,
      outstanding,
      receipt.id,
    );

    try {
      await updateDocument(nextInvoice);
      await addDocument(receipt);
      setDraft(nextInvoice);
      void saveNow(nextInvoice);
      setToast(`Receipt ${receipt.number} created.`);
    } catch (error) {
      console.error("Could not save payment:", error);
      setToast("Save failed. Please try again.");
    }
  };

  const sendPaymentRequest = async (rowId: string) => {
    const fresh = useAppStore
      .getState()
      .documents.find((d) => d.id === draft.id);
    if (!fresh?.paymentSchedule) return;
    const row = fresh.paymentSchedule.find((p) => p.id === rowId);
    if (!row) return;
    const outstanding = outstandingOn(row);
    if (outstanding <= 0) return;

    const requestNumber = nextDocumentNumber(
      "Payment Request",
      settings,
      documents,
    );
    const request = buildPaymentRequestFromInstallment(
      fresh,
      row,
      requestNumber,
      { amount: outstanding, brandProfileId: brand?.id },
    );

    const nextInvoice: MoneyDocument = {
      ...fresh,
      paymentSchedule: fresh.paymentSchedule.map((p) =>
        p.id === row.id ? { ...p, paymentRequestId: request.id } : p,
      ),
    };

    try {
      await updateDocument(nextInvoice);
      await addDocument(request);
      setDraft(nextInvoice);
      void saveNow(nextInvoice);
      setToast(`Payment request ${request.number} created.`);
      navigate(`/editor/${request.id}`);
    } catch (error) {
      console.error("Could not create payment request:", error);
      setToast("Save failed. Please try again.");
    }
  };

  const handleSettleAndRoll = (rowId: string) => {
    const next = settleAndRoll(
      draft.paymentSchedule ?? [],
      rowId,
      grandTotal(draft),
    );
    patch({ paymentSchedule: next });
    void saveNow({ ...draft, paymentSchedule: next });
    setToast("Shortfall rolled to the next period.");
  };

  const hidden = draft.hiddenBlocks ?? [];
  const toggleBlock = (blockId: string) => {
    if (hidden.includes(blockId))
      patch({ hiddenBlocks: hidden.filter((b) => b !== blockId) });
    else patch({ hiddenBlocks: [...hidden, blockId] });
  };

  const moveBlock = (blockId: string, dir: -1 | 1) => {
    const order = draft.blockOrder ?? BLOCKS.map((b) => b.id);
    const i = order.indexOf(blockId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ blockOrder: next });
  };

  const orderedBlocks = useMemo(() => {
    const order = draft.blockOrder ?? BLOCKS.map((b) => b.id);
    const byId = new Map(BLOCKS.map((b) => [b.id, b]));
    return order.map((id) => byId.get(id)).filter(Boolean) as typeof BLOCKS;
  }, [draft.blockOrder]);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this document?",
      message: "This cannot be undone.",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    deleteDocument(draft.id);
    navigate("/documents");
  };

  const onAssetSave = async (asset: Asset) => {
    if (!brand) return;
    await addAsset(asset);
    const p: Partial<BrandProfile> = {};
    if (replaceKind === "logo") p.logoAssetId = asset.id;
    if (replaceKind === "signature") p.signatureAssetId = asset.id;
    if (replaceKind === "seal") p.stampAssetId = asset.id;
    await updateBrandProfile({ ...brand, ...p });
    setReplaceKind(null);
  };

  const showPaidWatermark =
    draft.paidWatermark === true ||
    (draft.paidWatermark !== false &&
      draft.type !== "Payment Request" &&
      ((draft.type === "Receipt" && !draft.paymentSchedule?.length) ||
        (draft.status === "Paid" && !draft.paymentSchedule?.length) ||
        (draft.paymentSchedule?.length
          ? draft.paymentSchedule.every((p) => installmentPaid(p))
          : false)));

  const scheduleTotalsResult = scheduleTotals(draft);
  const scheduleProgressPct =
    scheduleTotalsResult.total > 0
      ? Math.min(
          100,
          Math.round(
            (scheduleTotalsResult.paid / scheduleTotalsResult.total) * 100,
          ),
        )
      : 0;

  return (
    <div className="editor-shell">
      <header className="editor-topbar">
        <IconButton label="Back" onClick={() => navigate("/documents")}>
          <ArrowLeft />
        </IconButton>
        <div className="editor-title">
          <strong>{draft.number || "Untitled"}</strong>
          <span className="saved-state">
            <Check />
            {saved ? "Saved" : dirty ? "Saving…" : "Saved"}
          </span>
        </div>
        <div className="mode-switch">
          <button
            className={mode === "edit" ? "active" : ""}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            className={mode === "preview" ? "active" : ""}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
        <Button
          variant="secondary"
          className="desktop-only"
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
        >
          <Eye size={17} /> {mode === "edit" ? "Preview" : "Edit"}
        </Button>
        <Button disabled={exporting} onClick={download}>
          <Download size={17} /> {exporting ? "Preparing…" : "Download PDF"}
        </Button>
        <IconButton label="Delete" onClick={handleDelete}>
          <Trash2 />
        </IconButton>
      </header>

      <aside className="editor-left">
        <div className="panel-tabs">
          <button className="active">Blocks</button>
        </div>
        <div className="block-list">
          {orderedBlocks.map((block, i) => (
            <div key={block.id} className="block-row">
              <button
                className={selected === block.id ? "active" : ""}
                onClick={() => setSelected(block.id)}
                style={{ opacity: hidden.includes(block.id) ? 0.4 : 1 }}
              >
                <GripVertical />
                <span>{block.label}</span>
                <Eye />
              </button>
              <div className="block-actions">
                <IconButton
                  label="Move up"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={i === 0}
                >
                  ↑
                </IconButton>
                <IconButton
                  label="Move down"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={i === orderedBlocks.length - 1}
                >
                  ↓
                </IconButton>
                <IconButton
                  label={hidden.includes(block.id) ? "Show" : "Hide"}
                  onClick={() => toggleBlock(block.id)}
                >
                  {hidden.includes(block.id) ? "+" : "×"}
                </IconButton>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            style={{ margin: "8px 16px 0" }}
            onClick={resetAllPositions}
          >
            <RotateCcw size={16} /> Reset all positions
          </Button>
        </div>
        <div className="shortcuts-hint">
          <strong>Shortcuts</strong>
          <span>⌘Z / ⌘⇧Z — undo / redo</span>
          <span>⌘S — save now</span>
          <span>Esc — deselect / cancel edit</span>
          <span>Delete — reset selected block positions</span>
          <span>Double-click any text — edit in place</span>
        </div>
      </aside>

      <section className="canvas-area">
        <Viewport
          zoom={zoom}
          onZoom={setZoom}
          onDeselect={() => setSelected(undefined)}
        >
          <DocumentPage
            doc={draft}
            brand={brand}
            assets={assets}
            linkedInvoice={linkedInvoice}
            preview={mode === "preview"}
            selected={selected}
            onSelect={setSelected}
            onPatch={patch}
            onBrandPatch={patchBrand}
            paperRef={paperRef}
          />
        </Viewport>
        <div className="history-controls">
          <IconButton
            label="Undo"
            onClick={undo}
            disabled={history.length === 0}
          >
            <Undo2 />
          </IconButton>
          <IconButton
            label="Redo"
            onClick={redo}
            disabled={future.length === 0}
          >
            <Redo2 />
          </IconButton>
        </div>
        <div className="zoom-controls">
          <IconButton
            label="Zoom out"
            onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
          >
            <Minus />
          </IconButton>
          <button onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <IconButton
            label="Zoom in"
            onClick={() => setZoom(Math.min(4, zoom + 0.1))}
          >
            <Plus />
          </IconButton>
          <span />
          <button onClick={() => setZoom(0.72)}>Fit</button>
        </div>
        <div className="page-count">Page 1 of 1</div>
      </section>

      <aside className="editor-right">
        <div className="properties-head">
          <div>
            <strong>
              {selected
                ? BLOCKS.find((b) => b.id === selected)?.label
                : "Document style"}
            </strong>
            <span>{selected ? "Block properties" : "Make it yours"}</span>
          </div>
        </div>

        {selected === "header" && (
          <div className="properties">
            <label>
              Document number
              <input
                value={draft.number}
                onChange={(e) => patch({ number: e.target.value })}
              />
            </label>
            <label>
              Client name
              <input
                value={draft.contact}
                onChange={(e) => patch({ contact: e.target.value })}
              />
            </label>
            <label>
              Client email
              <input
                value={draft.contactEmail ?? ""}
                onChange={(e) => patch({ contactEmail: e.target.value })}
              />
            </label>
            <label>
              Client address
              <input
                value={draft.contactAddress ?? ""}
                onChange={(e) => patch({ contactAddress: e.target.value })}
              />
            </label>
            <label>
              Client phone
              <input
                value={draft.contactPhone ?? ""}
                onChange={(e) => patch({ contactPhone: e.target.value })}
              />
            </label>
            <label>
              Issue date
              <input
                type="date"
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => patch({ dueDate: e.target.value })}
              />
            </label>
            {logo && (
              <Button
                variant="secondary"
                onClick={() => setReplaceKind("logo")}
              >
                Change logo
              </Button>
            )}
          </div>
        )}

        {selected === "items" && (
          <div className="properties">
            <div className="line-items-editor">
              {draft.items.length === 0 && (
                <p className="text-[var(--muted)]">No items yet.</p>
              )}
              {draft.items.map((item) => (
                <div key={item.id} className="line-item-row">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(item.id, { description: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(item.id, {
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) =>
                      updateLineItem(item.id, {
                        rate: Number(e.target.value),
                      })
                    }
                  />
                  <IconButton
                    label="Remove"
                    onClick={() => removeLineItem(item.id)}
                  >
                    ×
                  </IconButton>
                </div>
              ))}
              <Button variant="secondary" onClick={addLineItem}>
                <Plus /> Add item
              </Button>
              {libraryItems.length > 0 && (
                <select
                  onChange={(e) => {
                    const found = libraryItems.find(
                      (i) => i.id === e.target.value,
                    );
                    if (found) {
                      patch({
                        items: [
                          ...draft.items,
                          {
                            id: uuid(),
                            description: found.name,
                            quantity: 1,
                            rate: found.rate,
                          },
                        ],
                      });
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="">Add from library…</option>
                  {libraryItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} — {money(i.rate, draft.currency)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {selected === "schedule" && (
          <div className="properties">
            {!canHaveSchedule ? (
              <p className="text-xs text-[var(--muted)]">
                Payment schedules are available on Invoices and Quotations.
              </p>
            ) : !draft.paymentSchedule?.length ? (
              <>
                <p className="text-xs text-[var(--muted)]">
                  Break the total into a deposit and/or installments so the
                  client knows exactly what to pay and when.
                </p>

                <label>
                  Schedule
                  <select
                    value={formMode}
                    onChange={(e) =>
                      setFormMode(e.target.value as ScheduleMode)
                    }
                  >
                    <option value="deposit-installments">
                      Deposit + installments
                    </option>
                    <option value="deposit-only">Deposit only</option>
                    <option value="full">Pay in full</option>
                  </select>
                </label>

                {(formMode === "deposit-installments" ||
                  formMode === "deposit-only") && (
                  <>
                    <label>
                      Plan type
                      <div className="segmented">
                        <button
                          type="button"
                          className={
                            formScheduleKind === "count" ? "active" : ""
                          }
                          onClick={() => setFormScheduleKind("count")}
                        >
                          Fixed count
                        </button>
                        <button
                          type="button"
                          className={
                            formScheduleKind === "per-period" ? "active" : ""
                          }
                          onClick={() => setFormScheduleKind("per-period")}
                        >
                          Per-period amount
                        </button>
                      </div>
                    </label>

                    <label>
                      Deposit as
                      <div className="segmented">
                        <button
                          type="button"
                          className={
                            formDepositMode === "percent" ? "active" : ""
                          }
                          onClick={() => setFormDepositMode("percent")}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={
                            formDepositMode === "fixed" ? "active" : ""
                          }
                          onClick={() => setFormDepositMode("fixed")}
                        >
                          Amount
                        </button>
                      </div>
                    </label>

                    {formDepositMode === "percent" ? (
                      <label>
                        Deposit %
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formDeposit}
                          onChange={(e) =>
                            setFormDeposit(Number(e.target.value))
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        Deposit amount ({draft.currency || "currency"})
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formDepositAmount || ""}
                          onChange={(e) =>
                            setFormDepositAmount(Number(e.target.value))
                          }
                          placeholder="e.g. 5000"
                        />
                      </label>
                    )}
                  </>
                )}

                {formMode === "deposit-installments" &&
                  formScheduleKind === "count" && (
                    <>
                      <label>
                        Number of installments
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={formCount}
                          onChange={(e) => setFormCount(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Frequency
                        <select
                          value={formInterval}
                          onChange={(e) =>
                            setFormInterval(
                              e.target.value as InstallmentInterval,
                            )
                          }
                        >
                          <option value="monthly">Monthly</option>
                          <option value="biweekly">Every 2 weeks</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </label>
                    </>
                  )}

                {formMode === "deposit-installments" &&
                  formScheduleKind === "per-period" && (
                    <>
                      <label>
                        Amount per period ({draft.currency || "currency"})
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formPerPeriod || ""}
                          onChange={(e) =>
                            setFormPerPeriod(Number(e.target.value))
                          }
                          placeholder="e.g. 2000"
                        />
                      </label>
                      <label>
                        Frequency
                        <select
                          value={formInterval}
                          onChange={(e) =>
                            setFormInterval(
                              e.target.value as InstallmentInterval,
                            )
                          }
                        >
                          <option value="monthly">Monthly</option>
                          <option value="biweekly">Every 2 weeks</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </label>
                    </>
                  )}

                <label>
                  {formMode === "deposit-only"
                    ? "Deposit due"
                    : "First payment due"}
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                  />
                </label>

                {formMode === "deposit-only" && (
                  <label>
                    Balance due
                    <input
                      type="date"
                      value={formBalanceDate}
                      onChange={(e) => setFormBalanceDate(e.target.value)}
                    />
                  </label>
                )}

                <Button onClick={generateSchedule}>Generate schedule</Button>
              </>
            ) : (
              <>
                <div className="schedule-progress-box">
                  <div className="schedule-progress-head">
                    <strong>
                      {scheduleTotalsResult.paid >= scheduleTotalsResult.total
                        ? "Fully paid"
                        : `${money(
                            scheduleTotalsResult.paid,
                            draft.currency,
                          )} of ${money(
                            scheduleTotalsResult.total,
                            draft.currency,
                          )}`}
                    </strong>
                    <span>{scheduleProgressPct}%</span>
                  </div>
                  <div className="schedule-progress-bar">
                    <div
                      className="schedule-progress-fill"
                      style={{ width: `${scheduleProgressPct}%` }}
                    />
                  </div>
                </div>

                {draft.paymentSchedule.map((row) => {
                  const paid = installmentPaid(row);
                  const partial = installmentPartial(row);
                  const overdue = installmentOverdue(row);
                  const outstanding = outstandingOn(row);
                  const showRecorder = recordingFor === row.id;

                  return (
                    <div
                      key={row.id}
                      className={`schedule-editor-row ${
                        paid
                          ? "is-paid"
                          : partial
                            ? "is-partial"
                            : overdue
                              ? "is-overdue"
                              : ""
                      }`}
                    >
                      <div className="schedule-editor-head">
                        <input
                          type="text"
                          value={normalizeLabel(row.label)}
                          onChange={(e) =>
                            updateRow(row.id, { label: e.target.value })
                          }
                          className="schedule-input schedule-input-label"
                          placeholder="Label"
                          disabled={paid}
                        />
                        <input
                          key={`${row.id}-${row.amount}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={row.amount}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (Number.isFinite(n) && n >= 0) {
                              updateRow(row.id, { amount: n });
                            } else {
                              e.target.value = String(row.amount);
                            }
                          }}
                          className="schedule-input schedule-input-amount"
                          disabled={paid || (row.paidAmount ?? 0) > 0}
                        />
                      </div>

                      <div className="schedule-editor-meta">
                        <input
                          type="date"
                          value={row.dueDate}
                          onChange={(e) =>
                            updateRow(row.id, { dueDate: e.target.value })
                          }
                          className="schedule-input schedule-input-date"
                          disabled={paid}
                        />
                        {!paid && (
                          <button
                            type="button"
                            className="schedule-remove"
                            onClick={() => removeRow(row.id)}
                            title="Remove row"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <div className="schedule-editor-status">
                        {paid && (
                          <span className="status-pill status-paid">
                            ✓ Fully paid
                          </span>
                        )}
                        {partial && (
                          <span className="status-pill status-partial">
                            {money(row.paidAmount ?? 0, draft.currency)} of{" "}
                            {money(row.amount, draft.currency)} ·{" "}
                            {money(outstanding, draft.currency)} left
                          </span>
                        )}
                        {!paid && !partial && overdue && (
                          <span className="status-pill status-overdue">
                            Overdue
                          </span>
                        )}
                      </div>

                      <div className="schedule-editor-actions">
                        {!paid && !showRecorder && (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => sendPaymentRequest(row.id)}
                            >
                              <Send size={14} /> Request
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => startRecording(row)}
                            >
                              <Pencil size={14} /> Record
                            </Button>
                            {partial && (
                              <Button
                                variant="secondary"
                                onClick={() => handleSettleAndRoll(row.id)}
                              >
                                <Check size={14} /> Settle &amp; roll
                              </Button>
                            )}
                            <Button onClick={() => markFullyPaid(row.id)}>
                              <Check size={14} /> Full
                            </Button>
                          </>
                        )}

                        {!paid && showRecorder && (
                          <div className="record-payment-inline">
                            <label className="record-amount-label">
                              Amount received
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={recordAmount}
                                onChange={(e) =>
                                  setRecordAmount(e.target.value)
                                }
                                autoFocus
                              />
                            </label>
                            <div className="record-actions">
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setRecordingFor(null);
                                  setRecordAmount("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button onClick={() => confirmRecording(row.id)}>
                                <Check size={14} /> Confirm
                              </Button>
                            </div>
                          </div>
                        )}

                        {paid && row.receiptId && (
                          <Button
                            variant="secondary"
                            onClick={() => navigate(`/editor/${row.receiptId}`)}
                          >
                            <ReceiptIcon size={14} /> View last receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Button variant="secondary" onClick={addCustomRow}>
                  <Plus size={14} /> Add custom row
                </Button>
                <Button variant="secondary" onClick={clearSchedule}>
                  <RotateCcw size={16} /> Clear schedule
                </Button>
              </>
            )}
          </div>
        )}

        {selected === "totals" && (
          <div className="properties">
            <label>
              Amount paid (legacy)
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.amountPaid ?? ""}
                onChange={(e) =>
                  patch({
                    amountPaid: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                placeholder={draft.type === "Receipt" ? "Fully paid" : "0"}
              />
            </label>
            <div className="text-xs text-[var(--muted)]">
              Only used when there is no payment schedule.
            </div>
            {signature && (
              <>
                <label>
                  Signature width (mm)
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="1"
                    value={draft.signatureWidthMm ?? 40}
                    onChange={(e) =>
                      patch({ signatureWidthMm: Number(e.target.value) })
                    }
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={() => setReplaceKind("signature")}
                >
                  Change signature
                </Button>
              </>
            )}
          </div>
        )}

        {selected === "notes" && (
          <div className="properties">
            <label>
              Notes
              <textarea
                rows={5}
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Payment terms, thank-you note…"
              />
            </label>
          </div>
        )}

        {selected === "footer" && (
          <div className="properties">
            {seal && (
              <>
                <label>
                  Seal width (mm)
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="1"
                    value={draft.sealWidthMm ?? 25}
                    onChange={(e) =>
                      patch({ sealWidthMm: Number(e.target.value) })
                    }
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={() => setReplaceKind("seal")}
                >
                  Change seal
                </Button>
              </>
            )}
          </div>
        )}

        {(!selected ||
          ![
            "header",
            "items",
            "notes",
            "totals",
            "footer",
            "schedule",
          ].includes(selected)) && (
          <div className="properties">
            <label>
              Document type
              <select
                value={draft.type}
                onChange={(e) =>
                  patch({ type: e.target.value as DocumentType })
                }
              >
                <option>Invoice</option>
                <option>Receipt</option>
                <option>Quotation</option>
                <option>Voucher</option>
                <option>Payment Request</option>
              </select>
            </label>
            <label>
              Accent colour
              <input
                type="color"
                value={draft.accent || "#0B6B57"}
                onChange={(e) => patch({ accent: e.target.value })}
              />
            </label>
            <label>
              Currency
              <input
                value={draft.currency}
                onChange={(e) =>
                  patch({ currency: e.target.value.toUpperCase() })
                }
                placeholder="e.g. KES, USD"
              />
            </label>
            <label>
              Tax rate (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.taxRate ?? ""}
                onChange={(e) =>
                  patch({
                    taxRate: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                placeholder="0"
              />
            </label>
            <label>
              Page size
              <select
                value={draft.pageSize ?? "A4"}
                onChange={(e) =>
                  patch({ pageSize: e.target.value as PageSize })
                }
              >
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="LETTER">Letter</option>
                <option value="LEGAL">Legal</option>
              </select>
            </label>
            <label>
              Orientation
              <select
                value={draft.orientation ?? "portrait"}
                onChange={(e) =>
                  patch({ orientation: e.target.value as Orientation })
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label>
              Logo width (mm)
              <input
                type="range"
                min="10"
                max="80"
                step="1"
                value={draft.logoWidthMm ?? 22}
                onChange={(e) => patch({ logoWidthMm: Number(e.target.value) })}
              />
            </label>
            <label>
              Status
              <select
                value={draft.status}
                onChange={(e) => {
                  const newStatus = e.target.value as MoneyDocument["status"];
                  const update: Partial<MoneyDocument> = {
                    status: newStatus,
                  };
                  if (newStatus === "Paid" && !draft.amountPaid) {
                    update.amountPaid = total(draft) + taxFor(draft);
                  }
                  patch(update);
                }}
              >
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showPaidWatermark}
                onChange={(e) => patch({ paidWatermark: e.target.checked })}
              />
              <span>Show "PAID" watermark</span>
            </label>

            <div className="text-xs text-[var(--muted)]">
              Subtotal: {money(total(draft), draft.currency)} · Tax:{" "}
              {money(taxFor(draft), draft.currency)}
            </div>
          </div>
        )}
      </aside>

      <nav className="editor-mobile-toolbar">
        <button onClick={() => setShowBlocks(true)}>
          <FilePlus2 /> Blocks
        </button>
        <button onClick={() => setShowStyle(true)}>
          <Settings2 /> Style
        </button>
        <button onClick={() => setShowPage(true)}>
          <Palette /> Page
        </button>
        <button onClick={undo}>
          <Undo2 /> Undo
        </button>
        <button onClick={download}>
          <Download /> PDF
        </button>
      </nav>

      <Sheet
        open={showBlocks}
        title="Blocks"
        onClose={() => setShowBlocks(false)}
      >
        <div className="block-list">
          {orderedBlocks.map((block) => (
            <button
              key={block.id}
              onClick={() => {
                setSelected(block.id);
                setShowBlocks(false);
              }}
              style={{ opacity: hidden.includes(block.id) ? 0.4 : 1 }}
            >
              {block.label}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={showStyle} title="Style" onClose={() => setShowStyle(false)}>
        <div className="form-grid">
          <label>
            Accent colour
            <input
              type="color"
              value={draft.accent || "#0B6B57"}
              onChange={(e) => patch({ accent: e.target.value })}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showPaidWatermark}
              onChange={(e) => patch({ paidWatermark: e.target.checked })}
            />
            <span>Show "PAID" watermark</span>
          </label>
        </div>
      </Sheet>

      <Sheet open={showPage} title="Page" onClose={() => setShowPage(false)}>
        <div className="form-grid">
          <label>
            Page size
            <select
              value={draft.pageSize ?? "A4"}
              onChange={(e) => patch({ pageSize: e.target.value as PageSize })}
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="LETTER">Letter</option>
              <option value="LEGAL">Legal</option>
            </select>
          </label>
          <label>
            Orientation
            <select
              value={draft.orientation ?? "portrait"}
              onChange={(e) =>
                patch({ orientation: e.target.value as Orientation })
              }
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
        </div>
      </Sheet>

      <ImageImporter
        open={replaceKind !== null}
        kind={replaceKind === "seal" ? "stamp" : (replaceKind ?? "logo")}
        onClose={() => setReplaceKind(null)}
        onSave={onAssetSave}
      />

      {toast && (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm shadow-lg">
          <span>{toast}</span>
        </div>
      )}

      {pdfError && (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 shadow-lg">
          <strong className="block">Could not export PDF</strong>
          <span>{pdfError}</span>
          <button
            onClick={() => setPdfError(null)}
            className="ml-2 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
