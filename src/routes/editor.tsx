import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { Toolbar } from "@/components/editor/Toolbar";
import { PdfPage } from "@/components/editor/PdfPage";
import { SignatureModal } from "@/components/editor/SignatureModal";
import { loadPdfPages } from "@/lib/pdf/render";
import { exportPdf } from "@/lib/pdf/export";
import { saveSession, saveSignatures } from "@/lib/storage";
import { dict } from "@/lib/i18n";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor — Fill & Sign" },
      { name: "description", content: "Edit, fill and sign your PDF document." },
    ],
  }),
  component: Editor,
});

function Editor() {
  const navigate = useNavigate();
  const fileName = useEditor((s) => s.fileName);
  const pdfBytes = useEditor((s) => s.pdfBytes);
  const pages = useEditor((s) => s.pages);
  const elements = useEditor((s) => s.elements);
  const savedSignatures = useEditor((s) => s.savedSignatures);
  const lang = useEditor((s) => s.lang);
  const setLang = useEditor((s) => s.setLang);
  const addElement = useEditor((s) => s.addElement);
  const tool = useEditor((s) => s.tool);

  const [doc, setDoc] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [sigOpen, setSigOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cssWidth, setCssWidth] = useState(800);
  const t = dict[lang];

  // Redirect home if no doc
  useEffect(() => {
    if (!pdfBytes) void navigate({ to: "/" });
  }, [pdfBytes, navigate]);

  // Load pdf.js document from bytes
  useEffect(() => {
    if (!pdfBytes) return;
    let cancelled = false;
    void loadPdfPages(pdfBytes).then(({ doc }) => {
      if (!cancelled) setDoc(doc);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBytes]);

  // Responsive width
  useEffect(() => {
    function measure() {
      const w = containerRef.current?.clientWidth ?? 800;
      setCssWidth(Math.min(900, Math.max(320, w - 32)));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Auto-save session
  useEffect(() => {
    if (!pdfBytes || !fileName) return;
    const id = setTimeout(() => {
      void saveSession({ fileName, pdfBytes, pages, elements });
    }, 600);
    return () => clearTimeout(id);
  }, [pdfBytes, fileName, pages, elements]);

  useEffect(() => {
    void saveSignatures(savedSignatures);
  }, [savedSignatures]);

  // Signature modal trigger from page click when no saved signature
  useEffect(() => {
    function open() {
      setSigOpen(true);
    }
    window.addEventListener("open-signature-modal", open);
    return () => window.removeEventListener("open-signature-modal", open);
  }, []);

  // Open signature modal also when user clicks signature tool with nothing saved
  useEffect(() => {
    if (tool === "signature" && savedSignatures.length === 0) setSigOpen(true);
  }, [tool, savedSignatures.length]);

  async function handleDownload() {
    if (!pdfBytes || !fileName) return;
    setExporting(true);
    try {
      await exportPdf(pdfBytes, elements, fileName);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-muted/40" dir={dir}>
      <Toolbar
        lang={lang}
        onLangToggle={() => setLang(lang === "he" ? "en" : "he")}
        onDownload={() => void handleDownload()}
        onOpenSignature={() => setSigOpen(true)}
        onBack={() => void navigate({ to: "/" })}
        exporting={exporting}
      />

      {tool === "text" && (
        <div className="border-b border-border bg-card/60 px-4 py-2 text-center text-xs text-muted-foreground">
          {t.clickToAdd}
        </div>
      )}

      <div ref={containerRef} className="mx-auto max-w-5xl px-4 py-6">
        {!doc && <p className="py-12 text-center text-muted-foreground">{t.loading}</p>}
        {doc && (
          <div className="flex flex-col items-center gap-6">
            {pages.map((p, i) => (
              <div key={i} className="w-full">
                <div className="mb-1 text-center text-xs text-muted-foreground">
                  {t.page} {i + 1} {t.of} {pages.length}
                </div>
                <PdfPage pageIndex={i} pageSize={p} cssWidth={cssWidth} doc={doc} />
              </div>
            ))}
          </div>
        )}
      </div>

      <SignatureModal
        open={sigOpen}
        onClose={() => setSigOpen(false)}
        onPick={(dataUrl) => {
          // place at first page center
          if (!pages.length) return;
          const w = 160;
          const img = new Image();
          img.onload = () => {
            const h = (img.height / img.width) * w;
            const p = pages[0];
            addElement({
              id: crypto.randomUUID(),
              type: "signature",
              page: 0,
              x: p.width / 2 - w / 2,
              y: p.height / 2 - h / 2,
              w,
              h,
              dataUrl,
            });
          };
          img.src = dataUrl;
        }}
        lang={lang}
      />

    </div>
  );
}
