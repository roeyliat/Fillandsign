import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useEditor } from "@/store/editor";
import { dict, type Lang } from "@/lib/i18n";

export function SignatureModal({
  open,
  onClose,
  onPick,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (dataUrl: string) => void;
  lang: Lang;
}) {
  const t = dict[lang];
  const ref = useRef<SignatureCanvas | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const saved = useEditor((s) => s.savedSignatures);
  const addSaved = useEditor((s) => s.addSavedSignature);
  const removeSaved = useEditor((s) => s.removeSavedSignature);

  if (!open) return null;

  function handleSave() {
    if (!ref.current || ref.current.isEmpty()) return;
    const dataUrl = ref.current.getTrimmedCanvas().toDataURL("image/png");
    addSaved(dataUrl);
    onPick(dataUrl);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{t.signature}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.drawSignature}</p>
        <div className="mt-4 rounded-lg border-2 border-dashed border-border bg-background">
          <SignatureCanvas
            ref={ref}
            penColor="#111111"
            canvasProps={{ width: 480, height: 180, className: "block w-full" }}
            onEnd={() => setIsEmpty(false)}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              ref.current?.clear();
              setIsEmpty(true);
            }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            {t.clear}
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isEmpty}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {t.save}
          </button>
        </div>

        {saved.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium">{t.saved}</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {saved.map((d) => (
                <div
                  key={d}
                  className="group relative cursor-pointer rounded-md border border-border bg-background p-1 hover:border-primary"
                  onClick={() => {
                    onPick(d);
                    onClose();
                  }}
                >
                  <img src={d} alt="saved signature" className="h-14 w-full object-contain" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSaved(d);
                    }}
                    className="absolute -top-2 -right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground group-hover:flex"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
