// format.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// Scores are ALWAYS shown as a whole number from 0 to 100, never as a dash.
// Anything that isn't a proper number (null, undefined, NaN...) becomes 0.
// ---------------------------------------------------------------------------

/** Any value -> a whole number 0..100 (not a number -> 0). */
export function toScore(value: unknown): number {
  // Number.isFinite is false for NaN, Infinity, null, undefined and text.
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Any value -> the text to show, e.g. 99.6 -> "100", null -> "0". */
export function formatScore(value: unknown): string {
  return String(toScore(value));
}

/** A year for labels: 1801 -> "1801", -350 -> "c. 350 BCE". */
export function formatYear(year: number): string {
  return year < 0 ? `c. ${-year} BCE` : String(year);
}
