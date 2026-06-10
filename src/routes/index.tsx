import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDropzone } from "react-dropzone";
import { useEffect, useState } from "react";
import { FileUp, FileText, Languages, Trash2 } from "lucide-react";
import { useEditor } from "@/store/editor";
import { loadPdfPages } from "@/lib/pdf/render";
import { clearSession, hasSession, loadSession, loadSignatures } from "@/lib/storage";
import { dict, detectLang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fill & Sign — Edit and sign PDFs in your browser" },
      {
        name: "description",
        content:
          "Free in-browser tool to fill, edit and sign PDF documents with full Hebrew (RTL) and English support. No upload, no watermark.",
      },
      { property: "og:title", content: "Fill & Sign — Edit and sign PDFs in your browser" },
      {
        property: "og:description",
        content: "Fill, sign and download PDFs directly in your browser. Hebrew and English.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const lang = useEditor((s) => s.lang);
  const setLang = useEditor((s) => s.setLang);
  const loadDocument = useEditor((s) => s.loadDocument);
  const hydrate = useEditor((s) => s.hydrate);
  const [resumable, setResumable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = dict[lang];

  useEffect(() => {
    // Init lang from browser the first time
    setLang(detectLang());
    void hasSession().then(setResumable);
  }, [setLang]);

  async function openFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const { pages } = await loadPdfPages(buf);
      loadDocument(file.name, buf, pages);
      const sigs = await loadSignatures();
      if (sigs.length) {
        // Merge saved signatures into store
        useEditor.setState({ savedSignatures: sigs });
      }
      void navigate({ to: "/editor" });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to open PDF");
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    const s = await loadSession();
    if (!s) return;
    const sigs = await loadSignatures();
    hydrate({ ...s, savedSignatures: sigs });
    void navigate({ to: "/editor" });
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    onDrop: (files) => files[0] && void openFile(files[0]),
  });

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-background to-muted"
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">{t.appName}</span>
        </div>
        <button
          onClick={() => setLang(lang === "he" ? "en" : "he")}
          className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
        >
          <Languages className="h-4 w-4" />
          {lang === "he" ? "English" : "עברית"}
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-6">
        <h1 className="text-balance text-center text-4xl font-bold tracking-tight sm:text-5xl">
          {t.appName}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">{t.tagline}</p>

        <div
          {...getRootProps()}
          className={
            "mt-10 cursor-pointer rounded-2xl border-2 border-dashed bg-card p-10 text-center transition-colors " +
            (isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/60")
          }
        >
          <input {...getInputProps()} />
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <FileUp className="h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-medium">{t.dropHere}</p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <FileUp className="h-4 w-4" />
            {busy ? t.loading : t.uploadCta}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-destructive">{error}</p>
        )}

        {resumable && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-medium">{t.resume}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  void clearSession().then(() => setResumable(false));
                }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
                {t.discard}
              </button>
              <button
                onClick={() => void resume()}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t.resume}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

