import { useEditor, type Tool } from "@/store/editor";
import { dict, type Lang } from "@/lib/i18n";
import {
  Type,
  PenTool,
  Check,
  X,
  Undo2,
  Redo2,
  Download,
  ArrowLeft,
  Languages,
  MousePointer2,
} from "lucide-react";

export function Toolbar({
  lang,
  onLangToggle,
  onDownload,
  onOpenSignature,
  onBack,
  exporting,
}: {
  lang: Lang;
  onLangToggle: () => void;
  onDownload: () => void;
  onOpenSignature: () => void;
  onBack: () => void;
  exporting: boolean;
}) {
  const t = dict[lang];
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.past.length);
  const future = useEditor((s) => s.future.length);

  const toolBtn = (id: Tool, label: string, icon: React.ReactNode, onClick?: () => void) => (
    <button
      key={id}
      onClick={() => {
        if (onClick) onClick();
        setTool(id);
      }}
      className={
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
        (tool === id
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent")
      }
      title={label}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div
      className="sticky top-0 z-40 flex flex-wrap items-center gap-1 border-b border-border bg-card/95 px-3 py-2 backdrop-blur"
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        <span className="hidden sm:inline">{t.back}</span>
      </button>
      <div className="mx-1 h-6 w-px bg-border" />

      {toolBtn("select", "—", <MousePointer2 className="h-4 w-4" />)}
      {toolBtn("text", t.addText, <Type className="h-4 w-4" />)}
      {toolBtn("signature", t.addSignature, <PenTool className="h-4 w-4" />, onOpenSignature)}
      {toolBtn("check", t.addCheck, <Check className="h-4 w-4" />)}
      {toolBtn("x", t.addX, <X className="h-4 w-4" />)}

      <div className="mx-1 h-6 w-px bg-border" />

      <button
        onClick={undo}
        disabled={!past}
        className="rounded-md p-2 hover:bg-accent disabled:opacity-40"
        title={t.undo}
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        onClick={redo}
        disabled={!future}
        className="rounded-md p-2 hover:bg-accent disabled:opacity-40"
        title={t.redo}
      >
        <Redo2 className="h-4 w-4" />
      </button>

      <div className="flex-1" />

      <button
        onClick={onLangToggle}
        className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm hover:bg-accent"
        title={t.language}
      >
        <Languages className="h-4 w-4" />
        <span>{lang === "he" ? "EN" : "עב"}</span>
      </button>

      <button
        onClick={onDownload}
        disabled={exporting}
        className="ms-1 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {exporting ? t.exporting : t.download}
      </button>
    </div>
  );
}
