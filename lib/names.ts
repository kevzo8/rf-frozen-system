export function clean(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}
// lowercase collapsed key for dedupe: "  maria   Santos " -> "maria santos"
export function nameKey(s: string): string {
  return clean(s).toLowerCase();
}
// receipt display: ALL CAPS
export function nameDisplay(s: string): string {
  return clean(s).toUpperCase();
}
