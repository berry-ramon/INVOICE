import { GripVertical } from "lucide-react";
import type { RefObject } from "react";
import { EditableDate, EditableText } from "@/components/EditableText";
import {
  balanceDue,
  formatDate,
  grandTotal,
  initials,
  money,
  taxFor,
  total,
  totalPaid,
} from "@/lib/data";
import {
  installmentOverdue,
  installmentPaid,
  installmentPartial,
  scheduleTotals,
} from "@/lib/schedule";
import type { Asset, BrandProfile, MoneyDocument } from "@/types/models";

const DEFAULT_ORDER = [
  "header",
  "address",
  "items",
  "schedule",
  "totals",
  "notes",
  "footer",
] as const;

interface Props {
  doc: MoneyDocument;
  brand: BrandProfile | undefined;
  assets: Asset[];
  linkedInvoice?: MoneyDocument;
  preview?: boolean;
  selected?: string;
  onSelect?: (id?: string) => void;
  onPatch?: (patch: Partial<MoneyDocument>) => void;
  onBrandPatch?: (patch: Partial<BrandProfile>) => void;
  paperRef?: RefObject<HTMLDivElement | null>;
}

const ELEMENT_TO_BLOCK: Record<string, string> = {
  logo: "header",
  brandName: "header",
  brandAddress: "header",
  brandEmail: "header",
  brandPhone: "header",
  invoiceLabelType: "header",
  invoiceLabelNumber: "header",
  contactName: "address",
  contactAddress: "address",
  contactEmail: "address",
  contactPhone: "address",
  issueDate: "address",
  dueDate: "address",
  paymentDetails: "totals",
  signature: "totals",
  totalsList: "totals",
  notesText: "notes",
  footerLine: "footer",
  footerName: "footer",
  footerEmail: "footer",
  seal: "footer",
};

const has = (v?: string) => !!v && v.trim().length > 0;

export function DocumentPage({
  doc,
  brand,
  assets,
  linkedInvoice,
  preview = false,
  selected,
  onSelect,
  onPatch,
  onBrandPatch,
  paperRef,
}: Props) {
  const subtotal = total(doc);
  const tax = taxFor(doc);
  const totalWithTax = grandTotal(doc);
  const hasTax = (doc.taxRate ?? 0) > 0;
  const paid = totalPaid(doc);
  const balance = balanceDue(doc);
  const isPaymentRequest = doc.type === "Payment Request";
  const isReceipt = doc.type === "Receipt";

  const accent = doc.accent || brand?.accent || "#0B6B57";
  const logo = assets.find((a) => a.id === brand?.logoAssetId);
  const signature = assets.find((a) => a.id === brand?.signatureAssetId);
  const seal = assets.find((a) => a.id === brand?.stampAssetId);

  const schedule = doc.paymentSchedule ?? [];
  const linkedSchedule = linkedInvoice?.paymentSchedule ?? [];
  const totals = scheduleTotals(doc);
  const schedulePct =
    totals.total > 0
      ? Math.min(100, Math.round((totals.paid / totals.total) * 100))
      : 0;
  const paidRows = schedule.filter(installmentPaid).length;

  const showPaidWatermark =
    doc.paidWatermark === true ||
    (doc.paidWatermark !== false &&
      !isPaymentRequest &&
      ((isReceipt && !schedule.length) ||
        (doc.status === "Paid" && !schedule.length) ||
        (schedule.length > 0 && schedule.every((p) => installmentPaid(p)))));

  const hidden = doc.hiddenBlocks ?? [];
  const order = (doc.blockOrder?.filter((id) =>
    (DEFAULT_ORDER as readonly string[]).includes(id),
  ) as string[]) ?? [...DEFAULT_ORDER];

  const offsetOf = (id: string) => doc.elementOffsets?.[id] ?? { x: 0, y: 0 };

  const offsetStyle = (id: string) => {
    const o = offsetOf(id);
    if (o.x === 0 && o.y === 0) return undefined;
    return { transform: `translate(${o.x}px, ${o.y}px)` };
  };

  const startDrag = (id: string, e: React.PointerEvent) => {
    if (preview) return;
    const blockId = ELEMENT_TO_BLOCK[id];
    if (blockId) onSelect?.(blockId);

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffset = offsetOf(id);
    let dragStarted = false;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragStarted && Math.hypot(dx, dy) > 4) {
        dragStarted = true;
        try {
          target.setPointerCapture(pointerId);
        } catch {}
        target.classList.add("element-dragging");
      }
      if (!dragStarted) return;
      const paperEl = target.closest(".document-paper") as HTMLElement | null;
      const scale = paperEl
        ? paperEl.getBoundingClientRect().width / 794 || 1
        : 1;
      target.style.transform = `translate(${
        startOffset.x + dx / scale
      }px, ${startOffset.y + dy / scale}px)`;
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      if (!dragStarted) return;
      try {
        target.releasePointerCapture(pointerId);
      } catch {}
      target.classList.remove("element-dragging");
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const paperEl = target.closest(".document-paper") as HTMLElement | null;
      const scale = paperEl
        ? paperEl.getBoundingClientRect().width / 794 || 1
        : 1;
      onPatch?.({
        elementOffsets: {
          ...(doc.elementOffsets ?? {}),
          [id]: {
            x: Math.round((startOffset.x + dx / scale) * 10) / 10,
            y: Math.round((startOffset.y + dy / scale) * 10) / 10,
          },
        },
      });
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const startImageResize = (
    field: "logoWidthMm" | "signatureWidthMm" | "sealWidthMm",
    min: number,
    max: number,
    e: React.PointerEvent,
  ) => {
    if (preview) return;
    e.stopPropagation();
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const wrapper = handle.parentElement as HTMLElement | null;
    const img = wrapper?.querySelector("img") as HTMLImageElement | null;
    if (!wrapper || !img) return;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startWidth = doc[field] ?? (field === "logoWidthMm" ? 22 : 40);
    const startPx = img.getBoundingClientRect().width;
    if (startPx === 0) return;
    const pxPerMm = startPx / startWidth;
    try {
      handle.setPointerCapture(pointerId);
    } catch {}
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const deltaMm = (ev.clientX - startX) / pxPerMm;
      const next = Math.max(min, Math.min(max, startWidth + deltaMm));
      onPatch?.({
        [field]: Math.round(next * 10) / 10,
      } as Partial<MoneyDocument>);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      try {
        handle.releasePointerCapture(pointerId);
      } catch {}
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  const startBlockReorder = (blockId: string, e: React.PointerEvent) => {
    if (preview) return;
    e.stopPropagation();
    e.preventDefault();
    const grip = e.currentTarget as HTMLElement;
    const block = grip.closest(".paper-block") as HTMLElement | null;
    if (!block) return;
    const pointerId = e.pointerId;
    const startY = e.clientY;
    const startIndex = order.indexOf(blockId);
    const blockHeight = block.getBoundingClientRect().height || 80;
    try {
      grip.setPointerCapture(pointerId);
    } catch {}
    block.classList.add("reordering");
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      block.style.transform = `translateY(${ev.clientY - startY}px)`;
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      try {
        grip.releasePointerCapture(pointerId);
      } catch {}
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onUp);
      grip.removeEventListener("pointercancel", onUp);
      block.style.transform = "";
      block.classList.remove("reordering");
      const steps = Math.round((ev.clientY - startY) / blockHeight);
      if (steps !== 0 && startIndex >= 0) {
        const newIndex = Math.max(
          0,
          Math.min(order.length - 1, startIndex + steps),
        );
        if (newIndex !== startIndex) {
          const next = [...order];
          const [m] = next.splice(startIndex, 1);
          next.splice(newIndex, 0, m);
          onPatch?.({ blockOrder: next });
        }
      }
    };
    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onUp);
    grip.addEventListener("pointercancel", onUp);
  };

  const blockClass = (id: string) =>
    `paper-block block-${id} ${selected === id ? "selected" : ""} ${
      preview ? "preview" : ""
    }`;

  const blockDown = (id: string) =>
    preview
      ? undefined
      : (e: React.PointerEvent) => {
          e.stopPropagation();
          onSelect?.(id);
        };

  const grip = (id: string) =>
    preview ? null : (
      <div
        className="block-grip"
        onPointerDown={(e) => startBlockReorder(id, e)}
        title="Drag to reorder"
      >
        <GripVertical size={12} />
      </div>
    );

  const renderHeader = () => (
    <div className="invoice-header">
      <div className="brand-lockup">
        {logo ? (
          <div
            className="logo-resize-wrapper draggable-element"
            style={{
              width: `${doc.logoWidthMm ?? 22}mm`,
              ...offsetStyle("logo"),
            }}
            onPointerDown={(e) => startDrag("logo", e)}
          >
            <img
              src={logo.dataUrl}
              alt=""
              draggable={false}
              className="logo-img"
            />
            {!preview && (
              <div
                className="logo-resize-handle"
                onPointerDown={(e) =>
                  startImageResize("logoWidthMm", 10, 80, e)
                }
              />
            )}
          </div>
        ) : has(brand?.name) ? (
          <div className="brand-symbol" style={{ background: accent }}>
            {initials(brand?.name)}
          </div>
        ) : null}
        <div className="brand-info">
          {has(brand?.name) && (
            <EditableText
              as="strong"
              value={brand!.name}
              onChange={(v) => onBrandPatch?.({ name: v })}
              className="draggable-element"
              style={offsetStyle("brandName")}
              onPointerDown={(e) => startDrag("brandName", e)}
              editable={!preview}
            />
          )}
          {has(brand?.address) && (
            <EditableText
              value={brand!.address}
              onChange={(v) => onBrandPatch?.({ address: v })}
              className="draggable-element"
              style={offsetStyle("brandAddress")}
              onPointerDown={(e) => startDrag("brandAddress", e)}
              editable={!preview}
            />
          )}
          {has(brand?.email) && (
            <EditableText
              value={brand!.email}
              onChange={(v) => onBrandPatch?.({ email: v })}
              className="draggable-element"
              style={offsetStyle("brandEmail")}
              onPointerDown={(e) => startDrag("brandEmail", e)}
              editable={!preview}
            />
          )}
          {has(brand?.phone) && (
            <EditableText
              value={brand!.phone}
              onChange={(v) => onBrandPatch?.({ phone: v })}
              className="draggable-element"
              style={offsetStyle("brandPhone")}
              onPointerDown={(e) => startDrag("brandPhone", e)}
              editable={!preview}
            />
          )}
        </div>
      </div>
      <div className="invoice-label">
        <EditableText
          value={doc.type}
          onChange={(v) => onPatch?.({ type: v as MoneyDocument["type"] })}
          className="draggable-element"
          style={offsetStyle("invoiceLabelType")}
          onPointerDown={(e) => startDrag("invoiceLabelType", e)}
          editable={!preview}
        />
        <EditableText
          as="strong"
          value={doc.number}
          onChange={(v) => onPatch?.({ number: v })}
          className="draggable-element"
          style={offsetStyle("invoiceLabelNumber")}
          onPointerDown={(e) => startDrag("invoiceLabelNumber", e)}
          editable={!preview}
        />
        {isPaymentRequest && linkedInvoice && (
          <span className="payment-request-ref">
            For {linkedInvoice.type} {linkedInvoice.number}
            {(() => {
              const row = linkedInvoice.paymentSchedule?.find(
                (p) => p.id === doc.targetInstallmentId,
              );
              return row ? ` · ${row.label}` : null;
            })()}
          </span>
        )}
      </div>
    </div>
  );

  const renderAddress = () => (
    <div className="invoice-addresses">
      <div>
        <small>BILL TO</small>
        <EditableText
          as="strong"
          value={doc.contact}
          onChange={(v) => onPatch?.({ contact: v })}
          placeholder="Add a client"
          className="draggable-element"
          style={offsetStyle("contactName")}
          onPointerDown={(e) => startDrag("contactName", e)}
          editable={!preview}
        />
        <EditableText
          value={doc.contactAddress ?? ""}
          onChange={(v) => onPatch?.({ contactAddress: v })}
          placeholder="Add address"
          className="draggable-element"
          style={offsetStyle("contactAddress")}
          onPointerDown={(e) => startDrag("contactAddress", e)}
          editable={!preview}
        />
        <EditableText
          value={doc.contactEmail ?? ""}
          onChange={(v) => onPatch?.({ contactEmail: v })}
          placeholder="Add email"
          className="draggable-element"
          style={offsetStyle("contactEmail")}
          onPointerDown={(e) => startDrag("contactEmail", e)}
          editable={!preview}
        />
        <EditableText
          value={doc.contactPhone ?? ""}
          onChange={(v) => onPatch?.({ contactPhone: v })}
          placeholder="Add phone"
          className="draggable-element"
          style={offsetStyle("contactPhone")}
          onPointerDown={(e) => startDrag("contactPhone", e)}
          editable={!preview}
        />
      </div>
      <div>
        <dl>
          <dt>Issue date</dt>
          <dd>
            <EditableDate
              value={doc.date}
              onChange={(v) => onPatch?.({ date: v })}
              className="draggable-element"
              style={offsetStyle("issueDate")}
              onPointerDown={(e) => startDrag("issueDate", e)}
              editable={!preview}
            />
          </dd>
          <dt>Due date</dt>
          <dd>
            <EditableDate
              value={doc.dueDate}
              onChange={(v) => onPatch?.({ dueDate: v })}
              className="draggable-element"
              style={offsetStyle("dueDate")}
              onPointerDown={(e) => startDrag("dueDate", e)}
              editable={!preview}
            />
          </dd>
        </dl>
      </div>
    </div>
  );

  const renderItems = () => (
    <div className="invoice-table">
      <div
        className="invoice-tr invoice-th"
        style={{ backgroundColor: accent }}
      >
        <span>DESCRIPTION</span>
        <span>QTY</span>
        <span>RATE</span>
        <span>AMOUNT</span>
      </div>
      {doc.items.length === 0 && !preview && (
        <div className="invoice-tr invoice-empty">
          <div>
            <strong>No items yet</strong>
            <small>Add your first line item</small>
          </div>
          <span>-</span>
          <span>-</span>
          <strong>-</strong>
        </div>
      )}
      {doc.items.map((item) => (
        <div className="invoice-tr" key={item.id}>
          <div>
            <EditableText
              as="strong"
              value={item.description}
              onChange={(v) =>
                onPatch?.({
                  items: doc.items.map((i) =>
                    i.id === item.id ? { ...i, description: v } : i,
                  ),
                })
              }
              placeholder="Description"
              editable={!preview}
            />
          </div>
          <span>{item.quantity || 0}</span>
          <span>{money(item.rate, doc.currency)}</span>
          <strong>
            {money((item.quantity || 0) * (item.rate || 0), doc.currency)}
          </strong>
        </div>
      ))}
    </div>
  );

  /* ─── SCHEDULE (partial-aware) ───────────────────────── */
  const renderSchedule = () => {
    const rows = isPaymentRequest ? linkedSchedule : schedule;
    if (!rows.length) return null;

    const hasOverdue = totals.overdue > 0;
    const hasUpcoming = totals.upcoming > 0;
    const hasPaid = totals.paid > 0;

    return (
      <div className="invoice-schedule">
        <small>PAYMENT SCHEDULE</small>

        {!isPaymentRequest && (
          <div className="schedule-progress-canvas">
            <div className="schedule-progress-canvas-head">
              <span>
                {paidRows} of {rows.length} payments received
              </span>
              <strong>{schedulePct}%</strong>
            </div>
            <div className="schedule-progress-canvas-bar">
              <div
                className="schedule-progress-canvas-fill"
                style={{ width: `${schedulePct}%` }}
              />
            </div>
          </div>
        )}

        <div className="schedule-table">
          {rows.map((row) => {
            const paidRow = installmentPaid(row);
            const partialRow = installmentPartial(row);
            const overdueRow = installmentOverdue(row);
            const isTarget =
              isPaymentRequest && row.id === doc.targetInstallmentId;
            return (
              <div
                key={row.id}
                className={`schedule-row ${
                  paidRow ? "is-paid" : partialRow ? "is-partial" : ""
                } ${overdueRow ? "is-overdue" : ""} ${
                  isTarget ? "is-target" : ""
                }`}
              >
                <span className="schedule-dot" aria-hidden />
                <span className="schedule-label">
                  {paidRow ? "✓ " : partialRow ? "◐ " : ""}
                  {row.label}
                </span>
                <span className="schedule-date">{formatDate(row.dueDate)}</span>
                <span className="schedule-amount">
                  {partialRow ? (
                    <>
                      <strong>
                        {money(row.paidAmount ?? 0, doc.currency)}
                      </strong>
                      <small>of {money(row.amount, doc.currency)}</small>
                    </>
                  ) : (
                    money(row.amount, doc.currency)
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {!isPaymentRequest && (
          <div className="schedule-summary-multi">
            {hasPaid && (
              <div className="schedule-summary-line is-paid">
                <span>Paid to date</span>
                <strong>{money(totals.paid, doc.currency)}</strong>
              </div>
            )}
            {hasOverdue && (
              <div className="schedule-summary-line is-overdue">
                <span>Overdue now</span>
                <strong>{money(totals.overdue, doc.currency)}</strong>
              </div>
            )}
            {hasUpcoming && (
              <div className="schedule-summary-line is-upcoming">
                <span>Upcoming</span>
                <strong>{money(totals.upcoming, doc.currency)}</strong>
              </div>
            )}
            <div className="schedule-summary-line is-total">
              <span>Total outstanding</span>
              <strong>{money(totals.balance, doc.currency)}</strong>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTotals = () => {
    const hasSchedule = schedule.length > 0;
    return (
      <div className="invoice-summary">
        <div className="payment-note">
          {has(brand?.paymentDetails) && (
            <>
              <small>PAYMENT DETAILS</small>
              <EditableText
                value={brand!.paymentDetails}
                onChange={(v) => onBrandPatch?.({ paymentDetails: v })}
                className="draggable-element"
                style={offsetStyle("paymentDetails")}
                onPointerDown={(e) => startDrag("paymentDetails", e)}
                editable={!preview}
              />
            </>
          )}
          {signature && (
            <div className="signature-wrap">
              <div
                className="signature-resize-wrapper draggable-element"
                style={{
                  width: `${doc.signatureWidthMm ?? 40}mm`,
                  ...offsetStyle("signature"),
                }}
                onPointerDown={(e) => startDrag("signature", e)}
              >
                <img
                  src={signature.dataUrl}
                  alt=""
                  draggable={false}
                  className="logo-img"
                />
                {!preview && (
                  <div
                    className="logo-resize-handle"
                    onPointerDown={(e) =>
                      startImageResize("signatureWidthMm", 20, 100, e)
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>
        <dl
          className="draggable-element"
          style={offsetStyle("totalsList")}
          onPointerDown={(e) => startDrag("totalsList", e)}
        >
          <dt>Subtotal</dt>
          <dd>{money(subtotal, doc.currency)}</dd>

          {hasTax && (
            <>
              <dt>Tax · {doc.taxRate}%</dt>
              <dd>{money(tax, doc.currency)}</dd>
            </>
          )}

          <dt>Total</dt>
          <dd>{money(totalWithTax, doc.currency)}</dd>

          {(paid > 0 || hasSchedule) && (
            <>
              <dt>Amount paid</dt>
              <dd>{money(paid, doc.currency)}</dd>
            </>
          )}

          <dt className="grand-total">Balance due</dt>
          <dd className="grand-total">
            {balance === 0 && paid > 0 && (
              <span className="paid-pill">PAID</span>
            )}
            {money(balance, doc.currency)}
          </dd>
        </dl>
      </div>
    );
  };

  const renderNotes = () =>
    has(doc.notes) ? (
      <div className="invoice-notes">
        <small>NOTES</small>
        <EditableText
          as="p"
          value={doc.notes}
          onChange={(v) => onPatch?.({ notes: v })}
          multiline
          className="draggable-element"
          style={offsetStyle("notesText")}
          onPointerDown={(e) => startDrag("notesText", e)}
          editable={!preview}
        />
      </div>
    ) : null;

  const renderFooter = () => (
    <>
      <div
        className="footer-line-wrapper draggable-element"
        style={offsetStyle("footerLine")}
        onPointerDown={(e) => startDrag("footerLine", e)}
      >
        <div className="footer-line" />
      </div>
      {(has(brand?.name) || has(brand?.email)) && (
        <div className="footer-row">
          {has(brand?.name) && (
            <EditableText
              value={brand!.name}
              onChange={(v) => onBrandPatch?.({ name: v })}
              className="footer-name draggable-element"
              style={offsetStyle("footerName")}
              onPointerDown={(e) => startDrag("footerName", e)}
              editable={!preview}
            />
          )}
          {has(brand?.email) && (
            <EditableText
              value={brand!.email}
              onChange={(v) => onBrandPatch?.({ email: v })}
              className="footer-email draggable-element"
              style={offsetStyle("footerEmail")}
              onPointerDown={(e) => startDrag("footerEmail", e)}
              editable={!preview}
            />
          )}
        </div>
      )}
      {seal && (
        <div className="footer-seal">
          <div
            className="seal-image-wrapper draggable-element"
            style={{
              width: `${doc.sealWidthMm ?? 25}mm`,
              ...offsetStyle("seal"),
            }}
            onPointerDown={(e) => startDrag("seal", e)}
          >
            <img
              src={seal.dataUrl}
              alt=""
              draggable={false}
              className="logo-img"
            />
            {!preview && (
              <div
                className="logo-resize-handle"
                onPointerDown={(e) =>
                  startImageResize("sealWidthMm", 15, 60, e)
                }
              />
            )}
          </div>
        </div>
      )}
    </>
  );

  const renderBlock = (id: string) => {
    if (hidden.includes(id)) return null;
    switch (id) {
      case "header":
        return renderHeader();
      case "address":
        return renderAddress();
      case "items":
        return renderItems();
      case "schedule":
        return renderSchedule();
      case "totals":
        return renderTotals();
      case "notes":
        return renderNotes();
      case "footer":
        return renderFooter();
      default:
        return null;
    }
  };

  return (
    <article
      className="document-paper"
      ref={paperRef}
      onPointerDown={() => onSelect?.()}
      style={{ ["--doc-accent" as string]: accent }}
    >
      {showPaidWatermark && (
        <div className="paid-watermark" aria-hidden="true">
          <span>PAID</span>
        </div>
      )}

      {isPaymentRequest && linkedInvoice && (
        <div className="payment-request-banner">
          <small>PAYMENT REQUEST</small>
          <div>
            {money(totalWithTax, doc.currency)} · due{" "}
            {formatDate(doc.dueDate) || "on receipt"}
          </div>
        </div>
      )}

      {order.map((id) => {
        const content = renderBlock(id);
        if (content === null) return null;
        return (
          <div
            key={id}
            className={blockClass(id)}
            data-block-id={id}
            onPointerDown={blockDown(id)}
          >
            {grip(id)}
            {content}
          </div>
        );
      })}
    </article>
  );
}
