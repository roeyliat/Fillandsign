import { create } from "zustand";
import { detectLang, type Lang } from "@/lib/i18n";

export type Tool = "select" | "text" | "signature" | "check" | "x";

export type BaseElement = {
  id: string;
  page: number; // 0-indexed
  // Coordinates are in PDF points (1pt = 1/72 inch), top-left origin (we convert on export).
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TextElement = BaseElement & {
  type: "text";
  text: string;
  fontSize: number; // in pt
  color: string; // hex
};

export type SignatureElement = BaseElement & {
  type: "signature";
  dataUrl: string; // transparent PNG
};

export type MarkElement = BaseElement & {
  type: "check" | "x";
  color: string;
};

export type EditorElement = TextElement | SignatureElement | MarkElement;

export type PageSize = { width: number; height: number }; // in PDF points

type Snapshot = { elements: EditorElement[] };

type State = {
  fileName: string | null;
  pdfBytes: Uint8Array | null;
  pages: PageSize[];
  elements: EditorElement[];
  selectedId: string | null;
  tool: Tool;
  savedSignatures: string[];
  lang: Lang;
  // history
  past: Snapshot[];
  future: Snapshot[];
};

type Actions = {
  loadDocument: (fileName: string, bytes: Uint8Array, pages: PageSize[]) => void;
  clearDocument: () => void;
  setTool: (t: Tool) => void;
  setSelected: (id: string | null) => void;
  setLang: (l: Lang) => void;

  addElement: (el: EditorElement) => void;
  updateElement: (id: string, patch: Partial<EditorElement>) => void;
  removeElement: (id: string) => void;

  addSavedSignature: (dataUrl: string) => void;
  removeSavedSignature: (dataUrl: string) => void;

  undo: () => void;
  redo: () => void;

  hydrate: (data: {
    fileName: string;
    pdfBytes: Uint8Array;
    pages: PageSize[];
    elements: EditorElement[];
    savedSignatures: string[];
  }) => void;
};

function snapshot(s: State): Snapshot {
  return { elements: s.elements };
}

export const useEditor = create<State & Actions>((set, get) => ({
  fileName: null,
  pdfBytes: null,
  pages: [],
  elements: [],
  selectedId: null,
  tool: "text",
  savedSignatures: [],
  lang: detectLang(),
  past: [],
  future: [],

  loadDocument: (fileName, bytes, pages) =>
    set({
      fileName,
      pdfBytes: bytes,
      pages,
      elements: [],
      selectedId: null,
      past: [],
      future: [],
    }),

  clearDocument: () =>
    set({
      fileName: null,
      pdfBytes: null,
      pages: [],
      elements: [],
      selectedId: null,
      past: [],
      future: [],
    }),

  setTool: (t) => set({ tool: t }),
  setSelected: (id) => set({ selectedId: id }),
  setLang: (l) => set({ lang: l }),

  addElement: (el) =>
    set((s) => ({
      past: [...s.past, snapshot(s)].slice(-50),
      future: [],
      elements: [...s.elements, el],
      selectedId: el.id,
    })),

  updateElement: (id, patch) =>
    set((s) => ({
      past: [...s.past, snapshot(s)].slice(-50),
      future: [],
      elements: s.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as EditorElement) : e)),
    })),

  removeElement: (id) =>
    set((s) => ({
      past: [...s.past, snapshot(s)].slice(-50),
      future: [],
      elements: s.elements.filter((e) => e.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  addSavedSignature: (dataUrl) =>
    set((s) =>
      s.savedSignatures.includes(dataUrl)
        ? s
        : { savedSignatures: [dataUrl, ...s.savedSignatures].slice(0, 8) },
    ),

  removeSavedSignature: (dataUrl) =>
    set((s) => ({ savedSignatures: s.savedSignatures.filter((d) => d !== dataUrl) })),

  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = s.past[s.past.length - 1];
    set({
      past: s.past.slice(0, -1),
      future: [snapshot(s), ...s.future].slice(0, 50),
      elements: prev.elements,
      selectedId: null,
    });
  },
  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const next = s.future[0];
    set({
      past: [...s.past, snapshot(s)].slice(-50),
      future: s.future.slice(1),
      elements: next.elements,
      selectedId: null,
    });
  },

  hydrate: ({ fileName, pdfBytes, pages, elements, savedSignatures }) =>
    set({
      fileName,
      pdfBytes,
      pages,
      elements,
      savedSignatures,
      selectedId: null,
      past: [],
      future: [],
    }),
}));
