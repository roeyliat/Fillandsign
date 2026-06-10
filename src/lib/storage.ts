import { get, set, del } from "idb-keyval";
import type { EditorElement, PageSize } from "@/store/editor";

const KEY = "fill-sign:session:v1";
const SIG_KEY = "fill-sign:signatures:v1";

export type Session = {
  fileName: string;
  pdfBytes: Uint8Array;
  pages: PageSize[];
  elements: EditorElement[];
};

export async function saveSession(s: Session) {
  await set(KEY, s);
}

export async function loadSession(): Promise<Session | null> {
  const v = (await get(KEY)) as Session | undefined;
  return v ?? null;
}

export async function clearSession() {
  await del(KEY);
}

export async function loadSignatures(): Promise<string[]> {
  return ((await get(SIG_KEY)) as string[] | undefined) ?? [];
}

export async function saveSignatures(sigs: string[]) {
  await set(SIG_KEY, sigs);
}

export async function hasSession(): Promise<boolean> {
  const v = await get(KEY);
  return !!v;
}
