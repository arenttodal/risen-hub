import { isOpenWork, isVerified, type FundingScheme, type Project, type WorkItem } from './types.ts';

/**
 * What the Oversikt page says, decided here rather than in the page.
 *
 * The page this replaces opened with a hand-written sentence — "Gjør
 * TEFT-søknaden sendeklar. Tre dokumenter og to budsjettposter mangler" — that
 * no data supported. It was wrong the day it was written and would have stayed
 * wrong forever. Everything in this file is derived from the records, so the
 * page can only ever say something true, and the tests say what "true" means.
 */

export interface OverviewContext {
  /** ISO date, so "overdue" and "soon" are decided once and testably. */
  today: string;
}

export type FocusKind =
  | 'overdue'
  | 'deadline'
  | 'blocked'
  | 'unverified'
  | 'ready'
  | 'inbox'
  | 'clear';

export interface Focus {
  kind: FocusKind;
  /** The one sentence at the top of the page. */
  headline: string;
  /** Why it is the headline. Always a fact from the record, never a flourish. */
  detail: string;
  action: { label: string; href: string };
}

const DEADLINE_HORIZON_DAYS = 30;

/** Whole days from `today` to `iso`; negative once passed, null when undated. */
export function daysBetween(today: string, iso: string | null): number | null {
  if (!iso) return null;
  const from = Date.parse(`${today.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / 86_400_000);
}

const PRIORITY_RANK: Record<WorkItem['priority'], number> = { urgent: 0, high: 1, normal: 2, low: 3 };

/** Most overdue first; a tie goes to the higher priority. */
const byUrgency = (a: WorkItem, b: WorkItem) =>
  (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

/**
 * The single most pressing thing, in a fixed order of severity.
 *
 * The order is the whole point: something already late beats something merely
 * soon, a deadline the farm cannot move beats a task it can, and a blocker
 * beats work that is simply waiting to be picked up. Showing the second-most
 * pressing thing at the top would be worse than showing nothing.
 */
export function chooseFocus(
  work: WorkItem[],
  schemes: FundingScheme[],
  context: OverviewContext,
): Focus {
  const open = work.filter(isOpenWork);

  const overdue = open
    .filter(item => item.dueDate !== null && item.dueDate < context.today)
    .sort(byUrgency);
  if (overdue.length > 0) {
    const item = overdue[0];
    const late = Math.abs(daysBetween(context.today, item.dueDate) ?? 0);
    return {
      kind: 'overdue',
      headline: `«${item.title}» er ${late} ${late === 1 ? 'dag' : 'dager'} over fristen.`,
      detail:
        overdue.length === 1
          ? 'Dette er den eneste saken som har gått over fristen.'
          : `${overdue.length} saker har gått over fristen. Denne er eldst.`,
      action: { label: 'Åpne saken', href: `/hub/work?task=${item.id}` },
    };
  }

  const soon = schemes
    .filter(scheme => scheme.status !== 'passed' && scheme.status !== 'closed')
    .map(scheme => ({ scheme, days: daysBetween(context.today, scheme.deadlineAt) }))
    .filter((entry): entry is { scheme: FundingScheme; days: number } => entry.days !== null && entry.days >= 0)
    .filter(entry => entry.days <= DEADLINE_HORIZON_DAYS)
    .sort((a, b) => a.days - b.days);
  if (soon.length > 0) {
    const { scheme, days } = soon[0];
    return {
      kind: 'deadline',
      headline: `${scheme.name} har frist om ${days} ${days === 1 ? 'dag' : 'dager'}.`,
      detail: isVerified(scheme)
        ? `Fristen er bekreftet mot ${scheme.provider ?? 'ordningen'}.`
        : 'Fristen er ikke bekreftet mot ordningens egne sider. Sjekk den før dere planlegger etter den.',
      action: { label: 'Åpne finansiering', href: '/hub/funding' },
    };
  }

  const blocked = open.filter(item => item.status === 'blocked').sort(byUrgency);
  if (blocked.length > 0) {
    const item = blocked[0];
    return {
      kind: 'blocked',
      headline: `«${item.title}» står fast.`,
      detail:
        blocked.length === 1
          ? 'Ingenting annet er blokkert akkurat nå.'
          : `${blocked.length} saker er blokkerte. Denne haster mest.`,
      action: { label: 'Åpne saken', href: `/hub/work?task=${item.id}` },
    };
  }

  // Nothing is late and nothing is stuck, so the honest next move is to make
  // the research trustworthy before anyone plans around it.
  const unverified = schemes.filter(scheme => !isVerified(scheme) && scheme.status !== 'closed');
  if (unverified.length > 0) {
    return {
      kind: 'unverified',
      headline: `${unverified.length} av ${schemes.length} ordninger er ikke bekreftet.`,
      detail:
        'Ingen frist er nær, så dette er tiden til å sjekke dem mot ordningenes egne sider.',
      action: { label: 'Gå gjennom ordningene', href: '/hub/funding' },
    };
  }

  const ready = open.filter(item => item.status === 'ready').sort(byUrgency);
  if (ready.length > 0) {
    const item = ready[0];
    return {
      kind: 'ready',
      headline: `«${item.title}» er klar til å tas tak i.`,
      detail: `${ready.length} ${ready.length === 1 ? 'sak er' : 'saker er'} klare nå.`,
      action: { label: 'Åpne saken', href: `/hub/work?task=${item.id}` },
    };
  }

  const inbox = open.filter(item => item.status === 'inbox');
  if (inbox.length > 0) {
    return {
      kind: 'inbox',
      headline: `${inbox.length} ${inbox.length === 1 ? 'sak' : 'saker'} ligger uavklart i innboksen.`,
      detail: 'Ingenting er klart til å gjøres før de har fått et prosjekt og en status.',
      action: { label: 'Åpne innboksen', href: '/hub/work?filter=inbox' },
    };
  }

  return {
    kind: 'clear',
    headline: 'Ingenting haster akkurat nå.',
    detail: 'Ingen frister er nær, ingenting er forfalt og ingenting står fast.',
    action: { label: 'Se alt arbeid', href: '/hub/work' },
  };
}

export interface OverviewMetrics {
  activeProjects: number;
  totalProjects: number;
  openWork: number;
  readyWork: number;
  /** The nearest future deadline. Replaces the funding total, which was a number nobody acted on. */
  nextDeadline: { name: string; days: number; verified: boolean } | null;
  needsAttention: number;
}

export function overviewMetrics(
  projects: Project[],
  work: WorkItem[],
  schemes: FundingScheme[],
  context: OverviewContext,
): OverviewMetrics {
  const open = work.filter(isOpenWork);
  const upcoming = upcomingDeadlines(schemes, context);
  const first = upcoming[0];

  return {
    activeProjects: projects.filter(project => project.status === 'active').length,
    totalProjects: projects.length,
    openWork: open.length,
    readyWork: open.filter(item => item.status === 'ready').length,
    nextDeadline: first
      ? { name: first.scheme.name, days: first.days, verified: isVerified(first.scheme) }
      : null,
    needsAttention: open.filter(
      item =>
        item.status === 'blocked' ||
        item.status === 'inbox' ||
        item.priority === 'urgent' ||
        (item.dueDate !== null && item.dueDate < context.today),
    ).length,
  };
}

/** Future deadlines only, soonest first. A passed deadline is history, not a plan. */
export function upcomingDeadlines(
  schemes: FundingScheme[],
  context: OverviewContext,
): { scheme: FundingScheme; days: number }[] {
  return schemes
    .filter(scheme => scheme.status !== 'passed' && scheme.status !== 'closed')
    .map(scheme => ({ scheme, days: daysBetween(context.today, scheme.deadlineAt) }))
    .filter((entry): entry is { scheme: FundingScheme; days: number } => entry.days !== null && entry.days >= 0)
    .sort((a, b) => a.days - b.days);
}

/**
 * Projects with something actually happening.
 *
 * "Active" as a status field is a statement of intent; this is a statement of
 * fact. A project with no open work is not in motion however it is labelled.
 */
export function projectsInMotion(projects: Project[], work: WorkItem[]): Project[] {
  const openByProject = new Map<string, number>();
  for (const item of work.filter(isOpenWork)) {
    if (!item.projectId) continue;
    openByProject.set(item.projectId, (openByProject.get(item.projectId) ?? 0) + 1);
  }
  return projects
    .filter(project => (openByProject.get(project.id) ?? 0) > 0)
    .sort((a, b) => (openByProject.get(b.id) ?? 0) - (openByProject.get(a.id) ?? 0));
}

export interface Clarification {
  id: string;
  title: string;
  reason: string;
  href: string;
}

/**
 * What cannot move until someone decides something.
 *
 * This replaces the idea bank on the overview. An idea bank is browsing; this
 * is a queue, and a queue belongs on a page whose job is to say what to do next.
 */
export function needsClarification(work: WorkItem[], context: OverviewContext): Clarification[] {
  const open = work.filter(isOpenWork);
  const seen = new Set<string>();
  const out: Clarification[] = [];

  const add = (item: WorkItem, reason: string) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    out.push({ id: item.id, title: item.title, reason, href: `/hub/work?task=${item.id}` });
  };

  for (const item of open.filter(item => item.status === 'blocked').sort(byUrgency)) {
    add(item, 'Blokkert');
  }
  for (const item of open.filter(item => item.type === 'decision').sort(byUrgency)) {
    add(item, 'Venter på en beslutning');
  }
  for (const item of open.filter(item => item.status === 'inbox').sort(byUrgency)) {
    add(item, item.projectId ? 'Ikke planlagt' : 'Uten prosjekt');
  }
  for (const item of open
    .filter(item => item.dueDate !== null && item.dueDate < context.today)
    .sort(byUrgency)) {
    add(item, 'Over fristen');
  }
  return out;
}
