/**
 * Thermal printer paper-size preference.
 *
 * Most Indian restaurants use 80mm rolls, but many smaller ones (and older
 * TVS / Posiflex models) use 58mm. We persist the owner's choice per-device
 * so they don't have to re-pick on every print dialog.
 */
export type PaperSize = "80mm" | "58mm";

const KEY = "khaanpaan-paper-size";

export function getPaperSize(): PaperSize {
  if (typeof window === "undefined") return "80mm";
  const v = window.localStorage.getItem(KEY);
  return v === "58mm" ? "58mm" : "80mm";
}

export function setPaperSize(size: PaperSize): void {
  window.localStorage.setItem(KEY, size);
}

/** Tailwind class-name fragment to apply the selected paper size to .print-area */
export function paperClass(size: PaperSize): string {
  return size === "58mm" ? "paper-58mm" : "";
}
