/**
 * GST utilities for Indian restaurant billing.
 *
 * India GST slabs for restaurants (as of 2024):
 *   - Non-AC / standalone / no liquor:  5% GST (no ITC)
 *   - AC restaurant / part of hotel:    5% GST
 *   - Restaurants serving alcohol:      18% GST (with ITC)
 *
 * For dine-in, supply is intra-state → split into CGST + SGST (50:50).
 * For delivery/interstate → single IGST.
 *
 * We store a single `tax_percent` on the restaurant and split it here.
 */

export interface GSTBreakdown {
  taxPercent: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;        // used when restaurant marks as inter-state
  totalTax: number;
  total: number;
}

/**
 * Compute GST breakdown. For dine-in/intra-state, splits into CGST+SGST.
 * `isIgst` should be true for delivery orders going inter-state.
 */
export function computeGST(
  subtotal: number,
  taxPercent: number,
  isIgst = false
): GSTBreakdown {
  const half = taxPercent / 2;
  const totalTax = round2(subtotal * taxPercent / 100);

  let cgst = 0, sgst = 0, igst = 0;
  if (isIgst) {
    igst = totalTax;
  } else {
    cgst = round2(subtotal * half / 100);
    sgst = round2(subtotal * half / 100);
    // correct for rounding so cgst+sgst === totalTax
    sgst = round2(totalTax - cgst);
  }

  return {
    taxPercent,
    subtotal,
    cgst,
    sgst,
    igst,
    totalTax,
    total: round2(subtotal + totalTax),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Compute tax amount for a given subtotal and percent.
 * Always rounds to 2 decimals (paise precision). Use this everywhere client-side
 * so we never get float drift like ₹17.999999999 that bites when compared to
 * server-computed totals.
 */
export function computeTax(subtotal: number, taxPercent: number): number {
  return round2(subtotal * taxPercent / 100);
}

/** Format as "5%" or "18% (IGST)" */
export function gstLabel(pct: number, isIgst: boolean) {
  if (isIgst) return `IGST ${pct}%`;
  return `CGST ${pct / 2}% + SGST ${pct / 2}%`;
}
