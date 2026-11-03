import { toCanvas } from "html-to-image";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { MoneyDocument, Orientation, PageSize } from "@/types/models";

export class PdfExportError extends Error {}

const PAGE_DIMS_PT: Record<PageSize, [number, number]> = {
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  LETTER: [612, 792],
  LEGAL: [612, 1008],
};

function pageDims(size: PageSize, orientation: Orientation): [number, number] {
  const [w, h] = PAGE_DIMS_PT[size];
  return orientation === "landscape" ? [h, w] : [w, h];
}

export async function downloadDocumentPdf(
  paperEl: HTMLElement,
  doc: MoneyDocument,
) {
  try {
    /* ─── 1. Capture the canvas as an image ─────────────── */
    const stage = paperEl.closest(".stage") as HTMLElement | null;
    const originalTransform = stage?.style.transform ?? "";
    if (stage) stage.style.transform = "none";
    // Force layout recalculation
    void paperEl.offsetHeight;

    let canvas: HTMLCanvasElement;
    try {
      canvas = await toCanvas(paperEl, {
        pixelRatio: 1.5,
        backgroundColor: "#ffffff",
        width: paperEl.offsetWidth,
        height: paperEl.offsetHeight,
      });
    } finally {
      if (stage) stage.style.transform = originalTransform;
    }

    const imgData = canvas.toDataURL("image/png");

    /* ─── 2. Load pdfmake 0.3 with proper ESM unwrap ─────
       In 0.3, `addVirtualFileSystem` is on the DEFAULT
       export. A dynamic import returns a module namespace,
       so we must read `.default` (with a fallback for
       bundlers that inline the export).                    */
    const pdfMakeModule = await import("pdfmake/build/pdfmake");
    const pdfMake =
      (pdfMakeModule as unknown as { default?: unknown }).default ??
      pdfMakeModule;

    const vfsModule = await import("pdfmake/build/vfs_fonts");
    const pdfFonts =
      (vfsModule as unknown as { default?: unknown }).default ?? vfsModule;

    // Register the Roboto VFS once. Idempotent on pdfmake.
    if (typeof (pdfMake as any).addVirtualFileSystem === "function") {
      (pdfMake as any).addVirtualFileSystem(pdfFonts);
    } else if ((pdfMake as any).vfs === undefined) {
      // Fallback for older/edge builds that only expose `.vfs`
      (pdfMake as any).vfs = (pdfFonts as any)?.pdfMake?.vfs ?? pdfFonts;
    }

    /* ─── 3. Fit the captured image to the selected page ── */
    const pageSize = doc.pageSize ?? "A4";
    const orientation = doc.orientation ?? "portrait";
    const [pageWidth, pageHeight] = pageDims(pageSize, orientation);

    const imgAspect = canvas.width / canvas.height;
    const pageAspect = pageWidth / pageHeight;

    let renderWidth = pageWidth;
    let renderHeight = pageHeight;

    if (imgAspect > pageAspect) {
      renderHeight = pageWidth / imgAspect;
    } else {
      renderWidth = pageHeight * imgAspect;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    /* ─── 4. Build the PDF (single page, image fills) ───── */
    const definition: TDocumentDefinitions = {
      pageSize,
      pageOrientation: orientation,
      pageMargins: 0,
      content: [
        {
          image: imgData,
          width: renderWidth,
          height: renderHeight,
          absolutePosition: { x, y },
        },
      ],
    };

    /* ─── 5. Download. 0.3 returns a Promise. ──────────── */
    await (pdfMake as any)
      .createPdf(definition)
      .download(`${doc.number || "document"}.pdf`);
  } catch (error) {
    console.error("PDF export failed:", error);
    throw new PdfExportError(
      "Could not generate the PDF. Try again - if it keeps failing, use a smaller logo.",
    );
  }
}
