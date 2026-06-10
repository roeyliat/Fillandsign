import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fontAsset from "@/assets/fonts/NotoSansHebrew-Regular.ttf.asset.json";
import type { EditorElement } from "@/store/editor";
import { isRTL } from "@/lib/i18n";

let cachedFontBytes: ArrayBuffer | null = null;
async function getFontBytes(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  const res = await fetch(fontAsset.url);
  cachedFontBytes = await res.arrayBuffer();
  return cachedFontBytes;
}

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return rgb(0, 0, 0);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255);
}

export async function exportPdf(
  bytes: Uint8Array,
  elements: EditorElement[],
  fileName: string,
): Promise<void> {
  const pdfDoc = await PDFDocument.load(bytes.slice());
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(await getFontBytes(), { subset: true });

  const pages = pdfDoc.getPages();

  // Pre-embed signatures
  const sigCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedPng>>>();
  for (const el of elements) {
    if (el.type === "signature" && !sigCache.has(el.dataUrl)) {
      const png = await pdfDoc.embedPng(el.dataUrl);
      sigCache.set(el.dataUrl, png);
    }
  }

  for (const el of elements) {
    const page = pages[el.page];
    if (!page) continue;
    const pageHeight = page.getHeight();

    if (el.type === "text") {
      const lines = el.text.split("\n");
      const size = el.fontSize;
      const lineHeight = size * 1.25;
      lines.forEach((rawLine, i) => {
        const rtl = isRTL(rawLine);
        // pdf-lib draws glyphs LTR. For RTL text we reverse to visual order
        // and right-align inside the element's bounding box.
        const visual = rtl ? Array.from(rawLine).reverse().join("") : rawLine;
        const width = font.widthOfTextAtSize(visual, size);
        const xLeft = rtl ? el.x + el.w - width : el.x;
        // Convert top-left coords to pdf-lib's bottom-left baseline.
        const yTop = pageHeight - el.y - (i + 1) * lineHeight + (lineHeight - size) / 2;
        page.drawText(visual, {
          x: xLeft,
          y: yTop,
          size,
          font,
          color: hexToRgb(el.color),
        });
      });
    } else if (el.type === "signature") {
      const png = sigCache.get(el.dataUrl);
      if (!png) continue;
      page.drawImage(png, {
        x: el.x,
        y: pageHeight - el.y - el.h,
        width: el.w,
        height: el.h,
      });
    } else if (el.type === "check" || el.type === "x") {
      const color = hexToRgb(el.color);
      const pad = el.w * 0.15;
      const left = el.x + pad;
      const right = el.x + el.w - pad;
      const top = pageHeight - el.y - pad;
      const bottom = pageHeight - el.y - el.h + pad;
      const thickness = Math.max(1.5, Math.min(el.w, el.h) * 0.08);
      if (el.type === "x") {
        page.drawLine({
          start: { x: left, y: top },
          end: { x: right, y: bottom },
          thickness,
          color,
        });
        page.drawLine({
          start: { x: left, y: bottom },
          end: { x: right, y: top },
          thickness,
          color,
        });
      } else {
        // checkmark: short stroke down-right, long stroke up-right
        const midX = left + (right - left) * 0.38;
        const midY = bottom + (top - bottom) * 0.15;
        const leftY = bottom + (top - bottom) * 0.55;
        page.drawLine({
          start: { x: left, y: leftY },
          end: { x: midX, y: midY },
          thickness,
          color,
        });
        page.drawLine({
          start: { x: midX, y: midY },
          end: { x: right, y: top },
          thickness,
          color,
        });
      }
    }
  }

  const out = await pdfDoc.save();
  const blob = new Blob([out as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = fileName.replace(/\.pdf$/i, "");
  a.download = `${base || "document"}-signed.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
