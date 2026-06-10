// pdf.js loader — browser only. Configures the worker via Vite's ?url import.
import type { PageSize } from "@/store/editor";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerMod = (await import(
        /* @vite-ignore */ "pdfjs-dist/build/pdf.worker.min.mjs?url"
      )) as { default: string };
      pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function loadPdfPages(bytes: Uint8Array): Promise<{
  pages: PageSize[];
  doc: import("pdfjs-dist").PDFDocumentProxy;
}> {
  const pdfjs = await getPdfjs();
  // pdf.js will detach the buffer; pass a copy.
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pages: PageSize[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const v = p.getViewport({ scale: 1 });
    pages.push({ width: v.width, height: v.height });
  }
  return { pages, doc };
}

export async function renderPageToCanvas(
  doc: import("pdfjs-dist").PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  cssWidth: number,
) {
  const page = await doc.getPage(pageIndex + 1);
  const baseVp = page.getViewport({ scale: 1 });
  const scale = cssWidth / baseVp.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vp = page.getViewport({ scale: scale * dpr });
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssWidth * (baseVp.height / baseVp.width)}px`;
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
}
