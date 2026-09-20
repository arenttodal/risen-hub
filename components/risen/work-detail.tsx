'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { formatDate } from '@/lib/risen/format';
import { priorityLabels, statusLabels, typeLabels } from '@/lib/risen/work-views';
import { subtaskProgress, type WorkItem } from '@/lib/risen/types';
import type { WorkListProject } from './work-master-list';

/**
 * Route-addressable task detail.
 *
 * The open task lives in `?task=<id>`, so a task can be linked to, survives a
 * refresh, and closes with the browser back button. Title and description
 * autosave on a short debounce; a failed save keeps the text on screen and
 * says so rather than silently dropping it.
 */

interface Comment {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

interface ActivityRow {
  id: string;
  action: string;
  summary: string;
  createdAt: string;
}

interface DetailPayload {
  item: WorkItem;
  subtasks: WorkItem[];
  comments: Comment[];
  activity: ActivityRow[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const WEATHER_LABELS: Record<string, string> = {
  any: 'Uansett vær',
  dry: 'Krever oppholdsvær',
  indoor: 'Innendørs',
  frost_free: 'Frostfritt',
};

export function WorkDetail({ projects, places }: { projects: WorkListProject[]; places: WorkListProject[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const taskId = params?.get('task') ?? null;

  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>('idle');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [comment, setComment] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    const next = new URLSearchParams(params?.toString() ?? '');
    next.delete('task');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [params, pathname, router]);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/work/${id}`);
      if (!response.ok) throw new Error('not found');
      const payload = (await response.json()) as DetailPayload;
      setData(payload);
      setTitle(payload.item.title);
      setDetail(payload.item.detail ?? '');
    } catch {
      setLoadError('Fant ikke saken.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      openerRef.current = document.activeElement;
      void load(taskId);
    } else {
      setData(null);
      // Focus returns to whatever opened the panel, not to the top of the page.
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    }
  }, [taskId, load]);

  useEffect(() => {
    if (!taskId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
      // Keep tabbing inside the dialog while it is open.
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [taskId, close]);

  const patch = useCallback(
    async (body: Record<string, unknown>, { reload = true } = {}) => {
      if (!taskId) return false;
      setSave('saving');
      try {
        const response = await fetch(`/api/work/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('rejected');
        setSave('saved');
        if (reload) {
          await load(taskId);
          router.refresh();
        }
        return true;
      } catch {
        setSave('error');
        return false;
      }
    },
    [taskId, load, router],
  );

  /** Debounced so typing does not fire a request per keystroke. */
  function scheduleSave(body: Record<string, unknown>) {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void patch(body, { reload: false }).then(ok => {
        if (ok) router.refresh();
      });
    }, 600);
  }

  async function addSubtask() {
    if (!subtaskTitle.trim() || !taskId) return;
    setActionError(null);
    const response = await fetch(`/api/work/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: subtaskTitle }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { errors?: string[] };
      setActionError(body.errors?.[0] ?? 'Kunne ikke lagre underoppgaven.');
      return;
    }
    setSubtaskTitle('');
    await load(taskId);
    router.refresh();
  }

  async function toggleSubtask(sub: WorkItem) {
    await fetch(`/api/work/${sub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: sub.status === 'done' ? 'ready' : 'done' }),
    });
    if (taskId) await load(taskId);
    router.refresh();
  }

  async function addComment() {
    if (!comment.trim() || !taskId) return;
    setActionError(null);
    const response = await fetch(`/api/work/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: comment }),
    });
    if (!response.ok) {
      setActionError('Kunne ikke lagre kommentaren. Teksten er beholdt.');
      return;
    }
    setComment('');
    await load(taskId);
  }

  if (!taskId) return null;

  const item = data?.item;
  const progress = data ? subtaskProgress(data.subtasks) : null;

  return (
    <div className="detail-layer">
      <button type="button" className="detail-scrim" aria-label="Lukk" onClick={close} />
      <div
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={item ? item.title : 'Sak'}
        ref={dialogRef}
      >
        <header className="detail-bar">
          <span className="kicker">{item?.projectId ? projects.find(p => p.id === item.projectId)?.name ?? 'Sak' : 'Uten prosjekt'}</span>
          <span className={`save-state ${save}`} role="status">
            {save === 'saving' && (
              <>
                <Loader2 size={13} /> Lagrer…
              </>
            )}
            {save === 'saved' && 'Lagret'}
            {save === 'error' && 'Kunne ikke lagre'}
          </span>
          <button type="button" onClick={close} aria-label="Lukk">
            <X size={18} />
          </button>
        </header>

        {loading && !data && <p className="panel-empty">Laster…</p>}
        {loadError && (
          <p className="work-failure" role="alert">
            {loadError}
          </p>
        )}

        {item && (
          <div className="detail-body">
            <div className="detail-main">
              <div className="detail-title-row">
                <button
                  type="button"
                  className="complete-toggle"
                  aria-pressed={item.status === 'done'}
                  aria-label={item.status === 'done' ? 'Merk som ikke fullført' : 'Fullfør saken'}
                  onClick={() => patch({ status: item.status === 'done' ? 'ready' : 'done' })}
                >
                  {item.status === 'done' && <Check size={13} />}
                </button>
                <label className="sr-only" htmlFor="detail-title">
                  Tittel
                </label>
                <input
                  id="detail-title"
                  className="detail-title"
                  value={title}
                  onChange={event => {
                    setTitle(event.target.value);
                    scheduleSave({ title: event.target.value });
                  }}
                />
              </div>

              <label className="sr-only" htmlFor="detail-detail">
                Beskrivelse
              </label>
              <textarea
                id="detail-detail"
                className="detail-description"
                placeholder="Legg til en beskrivelse…"
                value={detail}
                rows={3}
                onChange={event => {
                  setDetail(event.target.value);
                  scheduleSave({ detail: event.target.value });
                }}
              />

              <section className="detail-section">
                <h3>
                  Underoppgaver
                  {progress && progress.total > 0 && (
                    <span className="count-tag tnum" aria-label={progress.label}>
                      {progress.done}/{progress.total}
                    </span>
                  )}
                </h3>
                {data.subtasks.map(sub => (
                  <article className={`subtask ${sub.status === 'done' ? 'is-done' : ''}`} key={sub.id}>
                    <button
                      type="button"
                      className="complete-toggle"
                      aria-pressed={sub.status === 'done'}
                      aria-label={`Fullfør «${sub.title}»`}
                      onClick={() => toggleSubtask(sub)}
                    >
                      {sub.status === 'done' && <Check size={12} />}
                    </button>
                    <span>{sub.title}</span>
                    <small>{statusLabels[sub.status]}</small>
                  </article>
                ))}
                <div className="subtask-add">
                  <label className="sr-only" htmlFor="subtask-input">
                    Ny underoppgave
                  </label>
                  <input
                    id="subtask-input"
                    value={subtaskTitle}
                    placeholder="Legg til underoppgave"
                    onChange={event => setSubtaskTitle(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void addSubtask();
                      }
                    }}
                  />
                </div>
              </section>

              <section className="detail-section">
                <h3>Kommentarer</h3>
                {data.comments.length === 0 && <p className="panel-empty">Ingen kommentarer ennå.</p>}
                {data.comments.map(entry => (
                  <article className="comment" key={entry.id}>
                    <header>
                      <strong>{entry.authorName ?? 'Risen'}</strong>
                      <time>{formatDate(entry.createdAt.slice(0, 10))}</time>
                    </header>
                    <p>{entry.body}</p>
                  </article>
                ))}
                <div className="comment-add">
                  <label className="sr-only" htmlFor="comment-input">
                    Ny kommentar
                  </label>
                  <textarea
                    id="comment-input"
                    rows={2}
                    value={comment}
                    placeholder="Skriv en kommentar…"
                    onChange={event => setComment(event.target.value)}
                  />
                  <button type="button" onClick={addComment} disabled={!comment.trim()}>
                    Legg til
                  </button>
                </div>
              </section>

              {data.activity.length > 0 && (
                <section className="detail-section">
                  <h3>Historikk</h3>
                  <ul className="activity-list">
                    {data.activity.map(entry => (
                      <li key={entry.id}>
                        <span>{entry.summary}</span>
                        <time>{formatDate(entry.createdAt.slice(0, 10))}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {actionError && (
                <p className="work-failure" role="alert">
                  {actionError}
                </p>
              )}
            </div>

            <aside className="detail-props">
              <PropSelect
                label="Status"
                value={item.status}
                options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
                onChange={value => patch({ status: value })}
              />
              <PropSelect
                label="Prosjekt"
                value={item.projectId ?? ''}
                options={[{ value: '', label: 'Uten prosjekt' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
                onChange={value => patch({ projectId: value || null })}
              />
              <PropSelect
                label="Sted"
                value={item.placeId ?? ''}
                options={[{ value: '', label: 'Ikke satt' }, ...places.map(p => ({ value: p.id, label: p.name }))]}
                onChange={value => patch({ placeId: value || null })}
              />
              <PropSelect
                label="Type"
                value={item.type}
                options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
                onChange={value => patch({ type: value })}
              />
              <PropSelect
                label="Prioritet"
                value={item.priority}
                options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))}
                onChange={value => patch({ priority: value })}
              />
              <PropText
                label="Ansvarlig"
                value={item.assignee ?? ''}
                placeholder="Ledig"
                onCommit={value => patch({ assignee: value || null })}
              />
              <PropText
                label="Frist"
                type="date"
                value={item.dueDate ?? ''}
                onCommit={value => patch({ dueDate: value || null })}
              />
              <PropText
                label="Anslått tid (timer)"
                type="number"
                value={item.estimatedHours === null ? '' : String(item.estimatedHours)}
                onCommit={value => patch({ estimatedHours: value === '' ? null : Number(value) })}
              />
              <PropText
                label="Antall personer"
                type="number"
                value={item.requiredPeople === null ? '' : String(item.requiredPeople)}
                onCommit={value => patch({ requiredPeople: value === '' ? null : Number(value) })}
              />
              <PropSelect
                label="Væravhengighet"
                value={item.weatherDependency ?? ''}
                options={[
                  { value: '', label: 'Ikke satt' },
                  ...Object.entries(WEATHER_LABELS).map(([value, label]) => ({ value, label })),
                ]}
                onChange={value => patch({ weatherDependency: value || null })}
              />
              <div className="prop-row">
                <span>Egnet for dugnad</span>
                <button
                  type="button"
                  className="prop-toggle"
                  aria-pressed={item.suitableForDugnad}
                  onClick={() => patch({ suitableForDugnad: !item.suitableForDugnad })}
                >
                  {item.suitableForDugnad ? 'Ja' : 'Nei'}
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function PropSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = `prop-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="prop-row">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Commits on blur or Enter, so a half-typed value is never saved. */
function PropText({
  label,
  value,
  type = 'text',
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const id = `prop-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="prop-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={draft}
        placeholder={placeholder}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
