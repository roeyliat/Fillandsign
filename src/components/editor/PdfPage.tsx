import { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { useEditor, type EditorElement, type PageSize } from "@/store/editor";
import { isRTL } from "@/lib/i18n";
import { renderPageToCanvas } from "@/lib/pdf/render";

type Props = {
  pageIndex: number;
  pageSize: PageSize; // PDF points
  cssWidth: number; // displayed width in px
  doc: import("pdfjs-dist").PDFDocumentProxy;
};

// Scale factor: pixels per PDF point
function scaleOf(cssWidth: number, pageSize: PageSize) {
  return cssWidth / pageSize.width;
}

export function PdfPage({ pageIndex, pageSize, cssWidth, doc }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tool = useEditor((s) => s.tool);
  const elements = useEditor((s) => s.elements.filter((e) => e.page === pageIndex));
  const addElement = useEditor((s) => s.addElement);
  const updateElement = useEditor((s) => s.updateElement);
  const setSelected = useEditor((s) => s.setSelected);
  const selectedId = useEditor((s) => s.selectedId);
  const removeElement = useEditor((s) => s.removeElement);
  const savedSignatures = useEditor((s) => s.savedSignatures);

  const scale = scaleOf(cssWidth, pageSize);
  const cssHeight = pageSize.height * scale;

  useEffect(() => {
    if (canvasRef.current) {
      void renderPageToCanvas(doc, pageIndex, canvasRef.current, cssWidth);
    }
  }, [doc, pageIndex, cssWidth]);

  function handlePageClick(e: React.MouseEvent) {
    if (e.target !== containerRef.current && e.target !== canvasRef.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = px / scale;
    const y = py / scale;
    const id = crypto.randomUUID();

    if (tool === "text") {
      addElement({
        id,
        page: pageIndex,
        type: "text",
        x,
        y,
        w: 160,
        h: 28,
        text: "",
        fontSize: 14,
        color: "#111111",
      });
    } else if (tool === "check" || tool === "x") {
      const size = 24;
      addElement({
        id,
        page: pageIndex,
        type: tool,
        x: x - size / 2,
        y: y - size / 2,
        w: size,
        h: size,
        color: "#0a7d2a",
      });
    } else if (tool === "signature") {
      const dataUrl = savedSignatures[0];
      if (!dataUrl) {
        // ask Toolbar to open modal
        window.dispatchEvent(new CustomEvent("open-signature-modal"));
        return;
      }
      // measure aspect from image
      const img = new Image();
      img.onload = () => {
        const w = 160;
        const h = (img.height / img.width) * w;
        addElement({
          id,
          page: pageIndex,
          type: "signature",
          x: x - w / 2,
          y: y - h / 2,
          w,
          h,
          dataUrl,
        });
      };
      img.src = dataUrl;
    } else {
      setSelected(null);
    }
  }

  return (
    <div className="relative mx-auto bg-white shadow-md" style={{ width: cssWidth }}>
      <div
        ref={containerRef}
        onMouseDown={handlePageClick}
        className="relative"
        style={{
          width: cssWidth,
          height: cssHeight,
          cursor:
            tool === "text"
              ? "text"
              : tool === "select"
                ? "default"
                : "crosshair",
        }}
      >
        <canvas ref={canvasRef} className="block select-none" />
        {elements.map((el) => (
          <ElementBox
            key={el.id}
            element={el}
            scale={scale}
            selected={selectedId === el.id}
            onSelect={() => setSelected(el.id)}
            onUpdate={(patch) => updateElement(el.id, patch)}
            onRemove={() => removeElement(el.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ElementBox({
  element,
  scale,
  selected,
  onSelect,
  onUpdate,
  onRemove,
}: {
  element: EditorElement;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<EditorElement>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(element.type === "text" && element.text === "");

  // Convert PDF-point coords to px
  const px = element.x * scale;
  const py = element.y * scale;
  const pw = element.w * scale;
  const ph = element.h * scale;

  return (
    <Rnd
      size={{ width: pw, height: ph }}
      position={{ x: px, y: py }}
      bounds="parent"
      onDragStart={onSelect}
      onResizeStart={onSelect}
      onDragStop={(_, d) => onUpdate({ x: d.x / scale, y: d.y / scale })}
      onResizeStop={(_, __, ref, ___, pos) => {
        const w = parseFloat(ref.style.width) / scale;
        const h = parseFloat(ref.style.height) / scale;
        const patch: Partial<EditorElement> = { w, h, x: pos.x / scale, y: pos.y / scale };
        if (element.type === "text") {
          // scale font roughly with height change
          const ratio = h / element.h;
          if (Math.abs(ratio - 1) > 0.05) {
            (patch as Partial<typeof element>).fontSize = Math.max(
              6,
              Math.round(element.fontSize * ratio),
            );
          }
        }
        onUpdate(patch);
      }}
      enableResizing={selected}
      disableDragging={editing}
      className={
        "group" + (selected ? " ring-2 ring-primary" : " ring-1 ring-transparent hover:ring-primary/40")
      }
      style={{ zIndex: selected ? 30 : 10 }}
    >
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onDoubleClick={() => element.type === "text" && setEditing(true)}
        className="relative h-full w-full"
      >
        {element.type === "text" && (
          <TextBoxContent
            element={element}
            scale={scale}
            editing={editing}
            onChange={(text) => onUpdate({ text })}
            onCommit={() => setEditing(false)}
          />
        )}
        {element.type === "signature" && (
          <img
            src={element.dataUrl}
            alt="signature"
            draggable={false}
            className="pointer-events-none block h-full w-full select-none object-contain"
          />
        )}
        {(element.type === "check" || element.type === "x") && (
          <svg viewBox="0 0 24 24" className="block h-full w-full" style={{ color: element.color }}>
            {element.type === "check" ? (
              <path
                d="M4 13l5 5L20 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M5 5l14 14M19 5L5 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
          </svg>
        )}
        {selected && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-3 -right-3 z-40 grid h-6 w-6 place-items-center rounded-full bg-destructive text-xs text-destructive-foreground shadow"
            aria-label="Delete element"
          >
            ×
          </button>
        )}
      </div>
    </Rnd>
  );
}

function TextBoxContent({
  element,
  scale,
  editing,
  onChange,
  onCommit,
}: {
  element: Extract<EditorElement, { type: "text" }>;
  scale: number;
  editing: boolean;
  onChange: (text: string) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const rtl = isRTL(element.text);
  const style: React.CSSProperties = {
    fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif",
    fontSize: element.fontSize * scale,
    color: element.color,
    lineHeight: 1.25,
    direction: rtl ? "rtl" : "ltr",
    textAlign: rtl ? "right" : "left",
    padding: 0,
    margin: 0,
  };

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={element.text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCommit();
        }}
        className="h-full w-full resize-none border-0 bg-transparent outline-none"
        style={style}
      />
    );
  }
  return (
    <div
      className="h-full w-full overflow-hidden whitespace-pre-wrap break-words"
      style={style}
    >
      {element.text || <span className="text-muted-foreground/60">Text</span>}
    </div>
  );
}
