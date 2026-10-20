/**
 * Spoken form of a duration, e.g. "25 seconds", "1 minute", "2 minutes 30 seconds".
 * Digits are left to the speech engine, which reads them naturally in the user's language.
 */
export function spokenDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(plural(minutes, 'minute'));
  if (seconds > 0 || minutes === 0) parts.push(plural(seconds, 'second'));
  return parts.join(' ');
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}
