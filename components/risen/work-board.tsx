'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, GripVertical } from 'lucide-react';
import {
  applyMoves,
  boardColumns,
  diffMoves,
  locate,
  planMove,
  stepTarget,
  type BoardDirection,
  type WorkMove,
} from '@/lib/risen/work-board';
import { priorityLabels, statusLabels } from '@/lib/risen/work-views';
import { formatDate } from '@/lib/risen/format';
import type { WorkItem, WorkStatus } from '@/lib/risen/types';
import { WorkInlineAdd } from './work-inline-add';

/**
 * The work board.
 *
 * A card can be moved by dragging it or by keyboard alone, and both routes go
 * through the same pure planner in `lib/risen/work-board.ts`, so they cannot
 * drift apart. Dragging is a pointer convenience layered on top of the keyboard
 * path, not the other way round.
 *
 * The keyboard route is a grab, move, drop: focus a card's handle, press Space
 * to pick it up, move with the arrow keys, and press Space again to drop or
 * Escape to put it back. Every step is announced in a live region, because a
 * move you cannot see is a move you have to be told about.
 *
 * Picking a card up also reveals four move buttons on it. Those are not a
 * decoration of the keyboard path — they are the only path that works on a
 * touch screen, where native drag does not fire and there are no arrow keys.
 */

const HELP =
  'Plukk opp med mellomrom, flytt med piltastene, slipp med mellomrom, avbryt med Escape.';

const MOVE_BUTTONS = [
  { direction: 'left' as const, label: 'Flytt til forrige kolonne', Icon: ArrowLeft },
  { direction: 'up' as const, label: 'Flytt opp', Icon: ArrowUp },
  { direction: 'down' as const, label: 'Flytt ned', Icon: ArrowDown },
  { direction: 'right' as const, label: 'Flytt til neste kolonne', Icon: ArrowRight },
];

export function WorkBoard({
  items,
  projectNames,
  today,
}: {
  items: WorkItem[];
  projectNames: Map<string, string>;
  today: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  /** Local overrides so a move shows immediately and can be rolled back. */
  const [preview, setPreview] = useState<WorkItem[] | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: WorkStatus; index: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [failure, setFailure] = useState<string | null>(null);

  /** What the board looked like before the grab, so Escape can restore it. */
  const beforeGrab = useRef<WorkItem[] | null>(null);
  const draggingId = useRef<string | null>(null);

  const current = preview ?? items;
  const columns = useMemo(() => boardColumns(current), [current]);

  const describe = useCallback(
    (itemId: string, cols = columns) => {
      const at = locate(cols, itemId);
      if (!at) return '';
      const column = cols.find(entry => entry.status === at.status)!;
      return `${statusLabels[at.status]}, plass ${at.index + 1} av ${column.items.length}`;
    },
    [columns],
  );

  /** Shows the move at once, then writes it. A refused write is rolled back. */
  const commit = useCallback(
    async (moves: WorkMove[], from: WorkItem[]) => {
      if (moves.length === 0) {
        setPreview(null);
        return;
      }
      setFailure(null);
      setPreview(applyMoves(from, moves));
      try {
        const response = await fetch('/api/work/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moves }),
        });
        if (!response.ok) throw new Error('rejected');
        startTransition(() => {
          router.refresh();
          setPreview(null);
        });
      } catch {
        setPreview(null);
        setFailure('Flyttingen ble ikke lagret. Tavla viser det som faktisk står i databasen.');
      }
    },
    [router],
  );

  const move = useCallback(
    (itemId: string, status: WorkStatus, index: number) => {
      const moves = planMove(columns, itemId, status, index);
      if (moves.length === 0) return;
      void commit(moves, current);
    },
    [columns, commit, current],
  );

  // ---- Keyboard: grab, move, drop ----

  const grab = useCallback(
    (item: WorkItem) => {
      beforeGrab.current = current;
      setGrabbedId(item.id);
      setAnnouncement(`«${item.title}» er plukket opp. ${describe(item.id)}. ${HELP}`);
    },
    [current, describe],
  );

  /**
   * Nothing has been written yet, so this is where the whole grab is saved —
   * as the single difference the steps add up to, not one write per step.
   */
  const drop = useCallback(
    (item: WorkItem) => {
      const from = beforeGrab.current;
      setGrabbedId(null);
      beforeGrab.current = null;
      setAnnouncement(`«${item.title}» sluppet i ${describe(item.id)}.`);
      if (from) void commit(diffMoves(from, current), from);
    },
    [commit, current, describe],
  );

  /** An honest cancel: the steps were only ever a preview. */
  const cancelGrab = useCallback((item: WorkItem) => {
    setGrabbedId(null);
    beforeGrab.current = null;
    setPreview(null);
    setAnnouncement(`Flytting av «${item.title}» avbrutt. Kortet står der det stod.`);
  }, []);

  const nudge = useCallback(
    (item: WorkItem, direction: BoardDirection) => {
      const target = stepTarget(columns, item.id, direction);
      if (!target) {
        setAnnouncement(`«${item.title}» kan ikke flyttes lenger den veien.`);
        return;
      }
      const next = applyMoves(current, planMove(columns, item.id, target.status, target.index));
      setPreview(next);
      setAnnouncement(`«${item.title}» flyttet til ${describe(item.id, boardColumns(next))}.`);
    },
    [columns, current, describe],
  );

  /**
   * A card that changes column is unmounted and remounted, taking focus with
   * it. Without this the second arrow key goes nowhere and the move silently
   * stops halfway.
   */
  useEffect(() => {
    if (!grabbedId) return;
    const grip = document.querySelector<HTMLButtonElement>(`[data-grip="${CSS.escape(grabbedId)}"]`);
    if (grip && document.activeElement !== grip) grip.focus();
  }, [grabbedId, current]);

  function onKeyDown(event: React.KeyboardEvent, item: WorkItem) {
    const grabbed = grabbedId === item.id;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (grabbed) drop(item);
      else grab(item);
      return;
    }
    if (event.key === 'Escape' && grabbed) {
      event.preventDefault();
      cancelGrab(item);
      return;
    }
    if (!grabbed) return;

    const directions: Record<string, BoardDirection> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    nudge(item, direction);
  }

  // ---- Pointer: native drag and drop ----

  function onDragStart(event: React.DragEvent, item: WorkItem) {
    draggingId.current = item.id;
    beforeGrab.current = current;
    event.dataTransfer.effectAllowed = 'move';
    // Firefox will not start a drag without data on the transfer.
    event.dataTransfer.setData('text/plain', item.id);
  }

  function onDragOver(event: React.DragEvent, status: WorkStatus, index: number) {
    if (!draggingId.current) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget({ status, index });
  }

  function onDrop(event: React.DragEvent, status: WorkStatus, index: number) {
    event.preventDefault();
    const id = draggingId.current ?? event.dataTransfer.getData('text/plain');
    draggingId.current = null;
    setDropTarget(null);
    if (!id) return;
    const item = current.find(entry => entry.id === id);
    move(id, status, index);
    if (item) setAnnouncement(`«${item.title}» flyttet til ${statusLabels[status]}.`);
  }

  function endDrag() {
    draggingId.current = null;
    setDropTarget(null);
  }

  return (
    <>
      {failure && (
        <p className="work-failure" role="alert">
          {failure}
        </p>
      )}

      <p className="board-help" id="board-help">
        Dra et kort, eller plukk det opp med håndtaket og flytt det med knappene
        eller piltastene.
      </p>

      <div className="work-board" onDragEnd={endDrag}>
        {columns.map(column => (
          <section
            className={`board-column${dropTarget?.status === column.status ? ' is-target' : ''}`}
            key={column.status}
            aria-label={column.label}
            onDragOver={event => onDragOver(event, column.status, column.items.length)}
            onDrop={event => onDrop(event, column.status, column.items.length)}
          >
            <header>
              <h3>{column.label}</h3>
              <span className="count-tag tnum">{column.items.length}</span>
            </header>

            {column.items.length === 0 && (
              <p className="board-column-empty">Ingen saker her</p>
            )}

            {column.items.map((item, index) => (
              <article
                className={`board-card${grabbedId === item.id ? ' is-grabbed' : ''}${
                  dropTarget?.status === column.status && dropTarget.index === index ? ' is-over' : ''
                }`}
                key={item.id}
                draggable
                onDragStart={event => onDragStart(event, item)}
                onDragOver={event => onDragOver(event, column.status, index)}
                onDrop={event => onDrop(event, column.status, index)}
              >
                <div className="board-card-head">
                  <button
                    type="button"
                    className="card-grip"
                    data-grip={item.id}
                    aria-label={`Flytt «${item.title}». ${HELP}`}
                    aria-describedby="board-help"
                    aria-pressed={grabbedId === item.id}
                    onKeyDown={event => onKeyDown(event, item)}
                    onClick={() => (grabbedId === item.id ? drop(item) : grab(item))}
                  >
                    <GripVertical size={14} />
                  </button>
                  <Link href={`/hub/work?task=${item.id}`}>{item.title}</Link>
                </div>

                <span>
                  {item.projectId ? projectNames.get(item.projectId) : 'Uten prosjekt'}
                  {item.dueDate ? ` · ${formatDate(item.dueDate)}` : ''}
                </span>
                <div className="board-card-foot">
                  {item.priority !== 'normal' && (
                    <span className={`priority-tag ${item.priority}`}>{priorityLabels[item.priority]}</span>
                  )}
                  {item.dueDate && item.dueDate < today && <span className="priority-tag urgent">Forfalt</span>}
                  <small>{item.assignee ?? 'Ledig'}</small>
                </div>

                {grabbedId === item.id && (
                  <div className="card-move" role="group" aria-label={`Flytt «${item.title}»`}>
                    {MOVE_BUTTONS.map(button => (
                      <button
                        key={button.direction}
                        type="button"
                        aria-label={button.label}
                        disabled={stepTarget(columns, item.id, button.direction) === null}
                        onClick={() => nudge(item, button.direction)}
                      >
                        <button.Icon size={14} />
                      </button>
                    ))}
                    {/* Not "Ferdig": that is the name of a column on this very
                        board, and a button that reads like a destination would
                        be pressed expecting to move the card there. */}
                    <button type="button" className="card-move-done" onClick={() => drop(item)}>
                      Slipp
                    </button>
                  </div>
                )}
              </article>
            ))}

            <WorkInlineAdd inheritStatus={column.status} label="Legg til" />
          </section>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
