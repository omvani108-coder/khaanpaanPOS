import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format INR currency. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Short human-readable elapsed time, e.g. "3m", "1h 12m". */
export function elapsedLabel(from: Date | string | number): string {
  const start = new Date(from).getTime();
  const diffMs = Date.now() - start;
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Human-readable time of day, e.g. "7:42 PM". */
export function formatTime(date: Date | string | number): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Generate a short random token (URL-safe). Used for QR table tokens. */
export function randomToken(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Next sequential invoice number. Falls back to timestamp-based if no prior exists. */
export function nextInvoiceNumber(prefix: string, lastNumber?: string | null): string {
  if (!lastNumber) {
    return `${prefix}-${new Date().getFullYear()}-0001`;
  }
  const m = lastNumber.match(/(\d+)$/);
  if (!m) return `${prefix}-${new Date().getFullYear()}-0001`;
  const next = String(Number(m[1]) + 1).padStart(m[1].length, "0");
  return lastNumber.replace(/\d+$/, next);
}
