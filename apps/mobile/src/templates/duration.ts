/**
 * Parses what a user types into a duration field. Accepts "90" (seconds), "1:30" and "1:02:00".
 * Returns null for anything else, including zero.
 */
export function parseDuration(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(:\d{1,2}){0,2}$/.test(trimmed)) return null;
  const parts = trimmed.split(':').map(Number);
  if (parts.slice(1).some((part) => part >= 60)) return null;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return seconds > 0 ? seconds : null;
}
