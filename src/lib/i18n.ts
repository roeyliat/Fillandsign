export type Lang = "he" | "en";

export const dict = {
  he: {
    appName: "מילוי וחתימה",
    tagline: "מלא, ערוך וחתום על מסמכי PDF ישירות בדפדפן",
    uploadCta: "העלה קובץ PDF",
    dropHere: "גרור קובץ PDF לכאן או לחץ לבחירה",
    resume: "המשך מסמך אחרון",
    tools: "כלים",
    addText: "טקסט",
    addSignature: "חתימה",
    addCheck: "סימן ✓",
    addX: "סימן ✗",
    undo: "בטל",
    redo: "בצע שוב",
    download: "הורד PDF",
    back: "חזרה",
    language: "שפה",
    signature: "חתימה",
    drawSignature: "צייר את חתימתך כאן",
    clear: "נקה",
    save: "שמור",
    cancel: "ביטול",
    saved: "חתימות שמורות",
    delete: "מחק",
    page: "עמוד",
    of: "מתוך",
    clickToAdd: "לחץ על המסמך כדי להוסיף טקסט",
    exporting: "מייצא...",
    loading: "טוען...",
    discard: "התחל מסמך חדש",
  },
  en: {
    appName: "Fill & Sign",
    tagline: "Fill, edit and sign PDF documents right in your browser",
    uploadCta: "Upload PDF",
    dropHere: "Drag a PDF here or click to choose",
    resume: "Resume last document",
    tools: "Tools",
    addText: "Text",
    addSignature: "Signature",
    addCheck: "Check ✓",
    addX: "Mark ✗",
    undo: "Undo",
    redo: "Redo",
    download: "Download PDF",
    back: "Back",
    language: "Language",
    signature: "Signature",
    drawSignature: "Draw your signature here",
    clear: "Clear",
    save: "Save",
    cancel: "Cancel",
    saved: "Saved signatures",
    delete: "Delete",
    page: "Page",
    of: "of",
    clickToAdd: "Click on the page to add text",
    exporting: "Exporting...",
    loading: "Loading...",
    discard: "Start a new document",
  },
} as const;

export type Dict = (typeof dict)["en"];

export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("he") ? "he" : "en";
}

// True if the string contains Hebrew or Arabic characters → RTL
export function isRTL(s: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u07BF\uFB1D-\uFEFC]/.test(s);
}
