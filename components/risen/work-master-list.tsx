'use client';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import {
  findView,
  groupWorkItems,
  priorityLabels,
  savedViews,
  selectWorkItems,
  sortWorkItems,
  statusLabels,
  typeLabels,
  workSummary,
  type GroupKey,
  type SortKey,
  type ViewContext,
  type ViewMode,
  type WorkFilters,
} from '@/lib/risen/work-views';
import { formatDate } from '@/lib/risen/format';
import type { WorkItem } from '@/lib/risen/types';
import { WorkInlineAdd } from './work-inline-add';
import { WorkBoard } from './work-board';

/**
 * The canonical master list.
 *
 * Every saved view, filter and grouping is a projection of the same array of
 * work items — nothing here copies a task into a second list. View state lives
 * in the URL so a filtered list can be shared and the back button works;
 * collapsed groups live in localStorage because they are a personal
 * presentation preference, not something to put in a link.
 */

const COLLAPSE_KEY = 'risen.work.collapsed';

export interface WorkListProject {
  id: string;
  name: string;
}

export function WorkMasterList({
  items,
  projects,
  today,
}: {
  items: WorkItem[];
  projects: WorkListProject[];
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const view = findView(params?.get('filter'));
  const mode = (params?.get('view') as ViewMode) ?? 'list';
  const group = (params?.get('group') as GroupKey) ?? 'status';
  const sort = (params?.get('sort') as SortKey) ?? 'manual';
  const query = params?.get('q') ?? '';
  const projectFilter = params?.get('project');
  const showCompleted = params?.get('completed') === '1';

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY);
      if (stored) setCollapsed(new Set(JSON.parse(stored) as string[]));
    } catch {
      // A blocked or empty localStorage just means nothing starts collapsed.
    }
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      } catch {
        // Presentation preference only; failing to persist is not worth an error.
      }
      return next;
    });
  }, []);

  /** Writes view state to the URL so it survives reload, sharing and back. */
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params?.toString() ?? '');
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      const queryString = next.toString();
      startTransition(() => router.replace(queryString ? `${pathname}?${queryString}` : pathname));
    },
    [params, pathname, router],
  );

  const context: ViewContext = useMemo(() => ({ today, currentPerson: null }), [today]);
  const projectNames = useMemo(
    () => new Map(projects.map(project => [project.id, project.name])),
    [projects],
  );

  const filters: WorkFilters = useMemo(
    () => ({ query, projectId: projectFilter, showCompleted }),
    [query, projectFilter, showCompleted],
  );

  const summary = useMemo(() => workSummary(items, context), [items, context]);
  const visible = useMemo(
    () => sortWorkItems(selectWorkItems(items, view, filters, context), sort),
    [items, view, filters, context, sort],
  );
  /**
   * The board always includes finished work.
   *
   * Its Ferdig column is what "show completed" means here, and without this a
   * card dropped into that column would disappear the moment it landed — the
   * one gesture on the board that should feel most final instead looks like
   * data loss.
   */
  const onBoard = useMemo(
    () => (mode === 'board'
      ? selectWorkItems(items, view, { ...filters, showCompleted: true }, context)
      : []),
    [mode, items, view, filters, context],
  );
  const groups = useMemo(
    () => groupWorkItems(visible, mode === 'board' ? 'status' : group, context, projectNames),
    [visible, group, mode, context, projectNames],
  );

  const activeFilters = [
    projectFilter ? { key: 'project', label: projectNames.get(projectFilter) ?? projectFilter } : null,
    query ? { key: 'q', label: `«${query}»` } : null,
    showCompleted ? { key: 'completed', label: 'Viser fullførte' } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  /** Optimistic completion: flip it locally, roll back if the server says no. */
  async function complete(item: WorkItem) {
    const next = item.status === 'done' ? 'ready' : 'done';
    setPendingIds(previous => new Set(previous).add(item.id));
    setFailure(null);
    try {
      const response = await fetch(`/api/work/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error('rejected');
      startTransition(() => router.refresh());
    } catch {
      setFailure(`Kunne ikke oppdatere «${item.title}». Status er uendret.`);
    } finally {
      setPendingIds(previous => {
        const copy = new Set(previous);
        copy.delete(item.id);
        return copy;
      });
    }
  }

  return (
    <div className="work-master">
      <div className="page-head">
        <div>
          <span className="kicker">Arbeid</span>
          <h2>Alt som må gjøres på Risen</h2>
        </div>
        <p className="tnum">
          {summary.open} åpne · {summary.ready} klare nå · {summary.attention} trenger avklaring
          {summary.overdue > 0 ? ` · ${summary.overdue} forfalt` : ''}
        </p>
      </div>

      <div className="work-toolbar">
        <label className="sr-only" htmlFor="work-view">
          Visning
        </label>
        <select
          id="work-view"
          className="toolbar-select"
          value={view.key}
          onChange={event => setParam('filter', event.target.value)}
        >
          {savedViews.map(saved => (
            <option key={saved.key} value={saved.key}>
              {saved.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="work-search">
          Søk i saker
        </label>
        <input
          id="work-search"
          className="toolbar-search"
          type="search"
          placeholder="Søk…"
          defaultValue={query}
          onChange={event => setParam('q', event.target.value)}
        />

        <label className="sr-only" htmlFor="work-project">
          Prosjekt
        </label>
        <select
          id="work-project"
          className="toolbar-select"
          value={projectFilter ?? ''}
          onChange={event => setParam('project', event.target.value || null)}
        >
          <option value="">Alle prosjekter</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="work-group">
          Gruppering
        </label>
        <select
          id="work-group"
          className="toolbar-select"
          value={group}
          onChange={event => setParam('group', event.target.value)}
          disabled={mode === 'board'}
        >
          <option value="status">Grupper: status</option>
          <option value="project">Grupper: prosjekt</option>
          <option value="assignee">Grupper: ansvarlig</option>
          <option value="due">Grupper: frist</option>
          <option value="priority">Grupper: prioritet</option>
          <option value="none">Ingen gruppering</option>
        </select>

        <div className="view-switch" role="group" aria-label="Visningsform">
          <button
            type="button"
            aria-pressed={mode === 'list'}
            onClick={() => setParam('view', null)}
          >
            Liste
          </button>
          <button
            type="button"
            aria-pressed={mode === 'board'}
            onClick={() => setParam('view', 'board')}
          >
            Tavle
          </button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map(chip => (
            <button key={chip.key} type="button" onClick={() => setParam(chip.key, null)}>
              {chip.label}
              <X size={13} />
            </button>
          ))}
          <button
            type="button"
            className="chip-reset"
            onClick={() => startTransition(() => router.replace(pathname))}
          >
            Nullstill
          </button>
        </div>
      )}

      {failure && (
        <p className="work-failure" role="alert">
          {failure}
        </p>
      )}

      {(mode === 'board' ? onBoard : visible).length === 0 ? (
        <div className="work-empty">
          <h3>{activeFilters.length > 0 ? 'Ingen saker matcher filtrene' : 'Ingen saker her ennå'}</h3>
          <p>
            {activeFilters.length > 0
              ? 'Prøv å fjerne et filter, eller legg til noe som må gjøres.'
              : 'Legg til noe som må gjøres. Uten prosjekt havner saken i Innboks.'}
          </p>
          <WorkInlineAdd />
        </div>
      ) : mode === 'board' ? (
        <WorkBoard items={onBoard} projectNames={projectNames} today={today} />
      ) : (
        <div className="work-groups">
          {groups.map(bucket => {
            const isCollapsed = collapsed.has(bucket.key);
            return (
              <section className="work-group" key={bucket.key}>
                <header>
                  <button
                    type="button"
                    className="group-toggle"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleGroup(bucket.key)}
                  >
                    {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                    {bucket.label}
                  </button>
                  <span className="count-tag tnum">{bucket.items.length}</span>
                </header>

                {!isCollapsed && (
                  <>
                    {bucket.items.map(item => (
                      <article
                        className={`work-line ${item.status === 'done' ? 'is-done' : ''} ${
                          pendingIds.has(item.id) ? 'is-pending' : ''
                        }`}
                        key={item.id}
                      >
                        <button
                          type="button"
                          className="complete-toggle"
                          onClick={() => complete(item)}
                          disabled={pendingIds.has(item.id)}
                          aria-pressed={item.status === 'done'}
                          aria-label={
                            item.status === 'done'
                              ? `Merk «${item.title}» som ikke fullført`
                              : `Fullfør «${item.title}»`
                          }
                        >
                          {item.status === 'done' && <Check size={13} />}
                        </button>

                        <div className="work-line-body">
                          <Link href={`/hub/work?task=${item.id}`} className="work-line-title">
                            {item.title}
                          </Link>
                          <span>
                            {item.projectId ? projectNames.get(item.projectId) : 'Uten prosjekt'}
                            {' · '}
                            {typeLabels[item.type]}
                            {group !== 'status' ? ` · ${statusLabels[item.status]}` : ''}
                            {item.estimatedHours ? ` · ${item.estimatedHours} t` : ''}
                          </span>
                        </div>

                        {item.priority !== 'normal' && (
                          <span className={`priority-tag ${item.priority}`}>
                            {priorityLabels[item.priority]}
                          </span>
                        )}
                        {item.dueDate && (
                          <time className={item.dueDate < today ? 'is-overdue tnum' : 'tnum'}>
                            {formatDate(item.dueDate)}
                          </time>
                        )}
                        <small>{item.assignee ?? 'Ledig'}</small>
                      </article>
                    ))}
                    <WorkInlineAdd
                      inheritStatus={bucket.inheritStatus}
                      inheritProjectId={bucket.inheritProjectId}
                      inheritType={view.key === 'purchases' ? 'purchase' : undefined}
                    />
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* A button rather than a checkbox: the state comes from the URL, which
          updates in a transition, and a controlled checkbox visibly reverts
          before the new value lands. aria-pressed carries the state instead.
          Hidden on the board, where the Ferdig column already shows them. */}
      {mode !== 'board' && (
        <button
          type="button"
          className="completed-toggle"
          aria-pressed={showCompleted}
          onClick={() => setParam('completed', showCompleted ? null : '1')}
        >
          {showCompleted ? 'Skjul fullførte saker' : 'Vis fullførte saker'}
        </button>
      )}
    </div>
  );
}
