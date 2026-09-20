/**
 * Saved views, filtering, grouping and sorting for the work master list.
 *
 * All of it is pure. Every view is a filter over the one canonical work item
 * table — there is no separate dataset for the inbox, for purchases or for
 * dugnad candidates, so the same task can appear in several views without ever
 * being duplicated.
 */

import { isOpenWork, type WorkItem, type WorkPriority, type WorkStatus, type WorkType } from './types.ts';

export type ViewMode = 'list' | 'board';
export type GroupKey = 'status' | 'project' | 'assignee' | 'due' | 'priority' | 'none';
export type SortKey = 'manual' | 'priority' | 'due' | 'created' | 'title';

export interface SavedView {
  key: string;
  label: string;
  describe: string;
  /** Completed work is hidden unless a view is explicitly about it. */
  includesCompleted?: boolean;
  match: (item: WorkItem, context: ViewContext) => boolean;
}

export interface ViewContext {
  /** Today as YYYY-MM-DD, injected so the views stay pure and testable. */
  today: string;
  /** Whose tasks "Mine oppgaver" means. Null until authentication exists. */
  currentPerson: string | null;
}

const isOverdue = (item: WorkItem, today: string) =>
  item.dueDate !== null && item.dueDate < today && isOpenWork(item);

const isDueWithin = (item: WorkItem, today: string, days: number) => {
  if (item.dueDate === null || !isOpenWork(item)) return false;
  const limit = new Date(`${today}T00:00:00.000Z`);
  limit.setUTCDate(limit.getUTCDate() + days);
  return item.dueDate <= limit.toISOString().slice(0, 10);
};

export const savedViews: SavedView[] = [
  {
    // The master view matches everything; whether completed work is shown is
    // decided by the toggle in selectWorkItems, not hidden here.
    key: 'all',
    label: 'Alle saker',
    describe: 'Hele arbeidsregisteret',
    match: () => true,
  },
  {
    key: 'inbox',
    label: 'Innboks',
    describe: 'Fanget opp, ikke organisert',
    match: item => item.status === 'inbox',
  },
  {
    key: 'today',
    label: 'I dag',
    describe: 'Forfaller i dag eller er forfalt',
    match: (item, ctx) => isOverdue(item, ctx.today) || item.dueDate === ctx.today,
  },
  {
    key: 'upcoming',
    label: 'Neste 7 dager',
    describe: 'Frist innen en uke',
    match: (item, ctx) => isDueWithin(item, ctx.today, 7),
  },
  {
    key: 'mine',
    label: 'Mine oppgaver',
    describe: 'Tildelt meg',
    match: (item, ctx) => ctx.currentPerson !== null && item.assignee === ctx.currentPerson,
  },
  {
    key: 'unassigned',
    label: 'Uten ansvarlig',
    describe: 'Ingen har tatt den',
    match: item => isOpenWork(item) && item.assignee === null,
  },
  {
    key: 'dugnad',
    label: 'Neste dugnad',
    describe: 'Egnet for en arbeidshelg',
    match: item => isOpenWork(item) && (item.suitableForDugnad || item.type === 'dugnad'),
  },
  {
    key: 'purchases',
    label: 'Innkjøp',
    describe: 'Må kjøpes inn',
    match: item => isOpenWork(item) && item.type === 'purchase',
  },
  {
    key: 'attention',
    label: 'Trenger avklaring',
    describe: 'Blokkert, forfalt eller haster',
    match: (item, ctx) =>
      isOpenWork(item) && (item.status === 'blocked' || item.priority === 'urgent' || isOverdue(item, ctx.today)),
  },
  {
    key: 'completed',
    label: 'Fullført',
    describe: 'Gjort unna',
    includesCompleted: true,
    match: item => item.status === 'done',
  },
];

export const findView = (key: string | null | undefined): SavedView =>
  savedViews.find(view => view.key === key) ?? savedViews[0];

export interface WorkFilters {
  projectId?: string | null;
  assignee?: string | null;
  status?: WorkStatus | null;
  type?: WorkType | null;
  priority?: WorkPriority | null;
  /** Free text over title and detail. */
  query?: string | null;
  /** Show completed work even in a view that normally hides it. */
  showCompleted?: boolean;
}

export function applyFilters(items: WorkItem[], filters: WorkFilters): WorkItem[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  return items.filter(item => {
    if (filters.projectId && item.projectId !== filters.projectId) return false;
    if (filters.assignee && item.assignee !== filters.assignee) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.type && item.type !== filters.type) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (query) {
      const haystack = `${item.title} ${item.detail ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/**
 * Applies a saved view then its filters. Subtasks are excluded from the master
 * list: they belong to their parent's detail, and listing them here would make
 * the same work look like two separate jobs.
 */
export function selectWorkItems(
  items: WorkItem[],
  view: SavedView,
  filters: WorkFilters,
  context: ViewContext,
): WorkItem[] {
  const topLevel = items.filter(item => item.parentId === null);
  const inView = topLevel.filter(item => view.match(item, context));
  const withCompleted =
    view.includesCompleted || filters.showCompleted ? inView : inView.filter(isOpenWork);
  return applyFilters(withCompleted, filters);
}

const PRIORITY_ORDER: Record<WorkPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function sortWorkItems(items: WorkItem[], sort: SortKey): WorkItem[] {
  const sorted = items.slice();
  switch (sort) {
    case 'priority':
      return sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    case 'due':
      // Undated work sinks below dated work rather than sorting as "very early".
      return sorted.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'nb'));
    case 'created':
      return sorted.sort((a, b) => a.id.localeCompare(b.id));
    case 'manual':
    default:
      return sorted.sort((a, b) => a.position - b.position);
  }
}

export interface WorkGroup {
  key: string;
  label: string;
  items: WorkItem[];
  /** Set when creating inside this group should inherit a status. */
  inheritStatus?: WorkStatus;
  inheritProjectId?: string;
}

export const STATUS_ORDER: WorkStatus[] = [
  'inbox',
  'planned',
  'ready',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
];

export const statusLabels: Record<WorkStatus, string> = {
  inbox: 'Innboks',
  planned: 'Planlagt',
  ready: 'Klar',
  in_progress: 'Pågår',
  blocked: 'Blokkert',
  done: 'Ferdig',
  cancelled: 'Avlyst',
};

export const typeLabels: Record<WorkType, string> = {
  task: 'Oppgave',
  repair: 'Reparasjon',
  purchase: 'Innkjøp',
  dugnad: 'Dugnad',
  inspection: 'Befaring',
  documentation: 'Dokumentasjon',
  decision: 'Beslutning',
};

export const priorityLabels: Record<WorkPriority, string> = {
  urgent: 'Haster',
  high: 'Høy',
  normal: 'Normal',
  low: 'Lav',
};

/** Buckets by due date, relative to the injected today. */
function dueBucket(item: WorkItem, today: string): { key: string; label: string } {
  if (item.dueDate === null) return { key: 'none', label: 'Uten frist' };
  if (item.dueDate < today) return { key: 'overdue', label: 'Forfalt' };
  if (item.dueDate === today) return { key: 'today', label: 'I dag' };
  return { key: 'later', label: 'Senere' };
}

export function groupWorkItems(
  items: WorkItem[],
  group: GroupKey,
  context: ViewContext,
  projectNames: Map<string, string>,
): WorkGroup[] {
  if (group === 'none') {
    return [{ key: 'all', label: 'Alle', items }];
  }

  if (group === 'status') {
    return STATUS_ORDER.map(status => ({
      key: status,
      label: statusLabels[status],
      items: items.filter(item => item.status === status),
      inheritStatus: status,
    })).filter(bucket => bucket.items.length > 0);
  }

  const buckets = new Map<string, WorkGroup>();
  const ensure = (key: string, label: string, extra: Partial<WorkGroup> = {}) => {
    if (!buckets.has(key)) buckets.set(key, { key, label, items: [], ...extra });
    return buckets.get(key)!;
  };

  for (const item of items) {
    if (group === 'project') {
      const key = item.projectId ?? 'none';
      const label = item.projectId ? (projectNames.get(item.projectId) ?? 'Ukjent prosjekt') : 'Uten prosjekt';
      ensure(key, label, item.projectId ? { inheritProjectId: item.projectId } : {}).items.push(item);
    } else if (group === 'assignee') {
      const key = item.assignee ?? 'none';
      ensure(key, item.assignee ?? 'Ledig').items.push(item);
    } else if (group === 'priority') {
      ensure(item.priority, priorityLabels[item.priority]).items.push(item);
    } else {
      const bucket = dueBucket(item, context.today);
      ensure(bucket.key, bucket.label).items.push(item);
    }
  }

  const order: Record<string, number> = { overdue: 0, today: 1, later: 2, none: 3 };
  return [...buckets.values()].sort((a, b) => (order[a.key] ?? 1) - (order[b.key] ?? 1));
}

/** Headline counts for the compact status line. */
export function workSummary(items: WorkItem[], context: ViewContext) {
  const topLevel = items.filter(item => item.parentId === null);
  const open = topLevel.filter(isOpenWork);
  return {
    open: open.length,
    ready: open.filter(item => item.status === 'ready').length,
    attention: open.filter(
      item => item.status === 'blocked' || item.priority === 'urgent' || isOverdue(item, context.today),
    ).length,
    overdue: open.filter(item => isOverdue(item, context.today)).length,
  };
}
