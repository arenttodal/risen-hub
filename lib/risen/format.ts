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

/**
 * Status codes in Norwegian, for reading an activity summary back.
 *
 * The log is history and is never rewritten, so entries written before the
 * writers learned to use these labels still read `done → in_progress`. That
 * makes a Norwegian reader translate the database in their head before they can
 * see what happened. Rewriting the rows would be editing history; rewriting the
 * rendering is just reading it aloud properly.
 */
const STATUS_WORDS: Record<string, string> = {
  inbox: 'Innboks',
  planned: 'Planlagt',
  ready: 'Klar',
  in_progress: 'Pågår',
  blocked: 'Blokkert',
  done: 'Ferdig',
  cancelled: 'Avlyst',
  doing: 'Pågår',
};

/**
 * Rewrites a trailing `code → code` transition in a stored summary.
 *
 * Deliberately narrow: it only touches the arrow pair at the very end of the
 * string, and only when *both* sides are known codes. A task legitimately
 * called "done" keeps its name, because a bare word is never rewritten.
 */
export function readableSummary(summary: string): string {
  return summary.replace(/([a-z_]+) → ([a-z_]+)$/, (whole, from: string, to: string) => {
    const a = STATUS_WORDS[from];
    const b = STATUS_WORDS[to];
    return a && b ? `${a} → ${b}` : whole;
  });
}
