/** Shared display formatting. Norwegian locale, since the hub is Norwegian. */

export const money = (value: number) => `${new Intl.NumberFormat('nb-NO').format(value)} kr`;

const DATE_FORMAT = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** ISO date to `1. okt. 2026`. Returns a dash rather than "Invalid Date". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_FORMAT.format(date);
}

/** Whole days until a date; negative once it has passed. Null when undated. */
export function daysUntil(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const msPerDay = 86_400_000;
  const startOfDay = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  return Math.round((startOfDay(date) - startOfDay(now)) / msPerDay);
}
