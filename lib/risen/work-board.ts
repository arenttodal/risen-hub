import { statusLabels } from './work-views.ts';
import type { WorkItem, WorkStatus } from './types.ts';

/**
 * Board layout and move planning.
 *
 * Everything here is pure: the same items in, the same columns and the same
 * list of writes out. The component does the dragging and the announcing; this
 * file decides what a move actually means, which is the part worth testing.
 */

/**
 * The columns a board always shows.
 *
 * `cancelled` is deliberately not one of them. It is an end state rather than a
 * stage of work, and a permanently empty seventh column would cost width on
 * every screen to serve a rare case. When cancelled items are in view they get
 * a column appended, so nothing on screen is ever undraggable.
 */
export const BOARD_STATUSES: WorkStatus[] = [
  'inbox',
  'planned',
  'ready',
  'in_progress',
  'blocked',
  'done',
];

export interface BoardColumn {
  status: WorkStatus;
  label: string;
  items: WorkItem[];
}

/**
 * Items laid out in columns.
 *
 * Empty columns are kept. A board whose empty columns disappear cannot be
 * dragged into, so the one place you most need a drop target is the one place
 * it would be missing.
 */
export function boardColumns(items: WorkItem[]): BoardColumn[] {
  const statuses = [...BOARD_STATUSES];
  if (items.some(item => item.status === 'cancelled')) statuses.push('cancelled');

  return statuses.map(status => ({
    status,
    label: statusLabels[status],
    items: items
      .filter(item => item.status === status)
      .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, 'nb')),
  }));
}

export interface WorkMove {
  id: string;
  status: WorkStatus;
  position: number;
}

/** Where a card currently sits, or null when it is not on the board. */
export function locate(columns: BoardColumn[], itemId: string): { status: WorkStatus; index: number } | null {
  for (const column of columns) {
    const index = column.items.findIndex(item => item.id === itemId);
    if (index !== -1) return { status: column.status, index };
  }
  return null;
}

/**
 * The writes needed to put `itemId` at `toIndex` of `toStatus`.
 *
 * Both affected columns are renumbered from zero, because positions that only
 * ever grow eventually collide and sort by insertion order instead of by
 * intent. Rows that end up exactly where they started are left out, so a drag
 * that changes nothing writes nothing.
 */
export function planMove(
  columns: BoardColumn[],
  itemId: string,
  toStatus: WorkStatus,
  toIndex: number,
): WorkMove[] {
  const from = locate(columns, itemId);
  if (!from) return [];

  const source = columns.find(column => column.status === from.status);
  const target = columns.find(column => column.status === toStatus);
  if (!source || !target) return [];

  const moved = source.items[from.index];
  const sourceItems = source.items.filter(item => item.id !== itemId);
  const targetItems = toStatus === from.status ? sourceItems : [...target.items];

  const clamped = Math.max(0, Math.min(toIndex, targetItems.length));
  targetItems.splice(clamped, 0, moved);

  const writes = new Map<string, WorkMove>();
  const renumber = (status: WorkStatus, list: WorkItem[]) => {
    list.forEach((item, position) => {
      const isMoved = item.id === itemId;
      const statusNow = isMoved ? status : item.status;
      if (item.position === position && statusNow === item.status) return;
      writes.set(item.id, { id: item.id, status: statusNow, position });
    });
  };

  renumber(toStatus, targetItems);
  if (toStatus !== from.status) renumber(from.status, sourceItems);

  // A cross-column move always writes the card itself, even when its index and
  // position happen to coincide — the status is what changed.
  if (toStatus !== from.status && !writes.has(itemId)) {
    writes.set(itemId, { id: itemId, status: toStatus, position: clamped });
  }

  return [...writes.values()];
}

/** The board after a planned move, so the UI can show it before the server agrees. */
export function applyMoves(items: WorkItem[], moves: WorkMove[]): WorkItem[] {
  if (moves.length === 0) return items;
  const byId = new Map(moves.map(move => [move.id, move]));
  return items.map(item => {
    const move = byId.get(item.id);
    return move ? { ...item, status: move.status, position: move.position } : item;
  });
}

export type BoardDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Where an arrow key should send a grabbed card.
 *
 * Moving into another column lands at the same index where possible, so a card
 * does not jump to the top of every column it passes through. Null means the
 * move would leave the board and should simply be ignored.
 */
export function stepTarget(
  columns: BoardColumn[],
  itemId: string,
  direction: BoardDirection,
): { status: WorkStatus; index: number } | null {
  const at = locate(columns, itemId);
  if (!at) return null;
  const columnIndex = columns.findIndex(column => column.status === at.status);

  if (direction === 'up' || direction === 'down') {
    const index = at.index + (direction === 'up' ? -1 : 1);
    if (index < 0 || index >= columns[columnIndex].items.length) return null;
    return { status: at.status, index };
  }

  const nextColumn = columnIndex + (direction === 'left' ? -1 : 1);
  if (nextColumn < 0 || nextColumn >= columns.length) return null;
  const destination = columns[nextColumn];
  return { status: destination.status, index: Math.min(at.index, destination.items.length) };
}

/**
 * The writes needed to turn `before` into `after`.
 *
 * A keyboard move is several steps that end in one drop, so the steps are held
 * as a preview and only this difference is ever sent. That is what makes Escape
 * an honest cancel: until the drop, nothing has been written.
 */
export function diffMoves(before: WorkItem[], after: WorkItem[]): WorkMove[] {
  const original = new Map(before.map(item => [item.id, item]));
  const moves: WorkMove[] = [];
  for (const item of after) {
    const was = original.get(item.id);
    if (!was) continue;
    if (was.status === item.status && was.position === item.position) continue;
    moves.push({ id: item.id, status: item.status, position: item.position });
  }
  return moves;
}
