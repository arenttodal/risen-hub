import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BOARD_STATUSES,
  applyMoves,
  boardColumns,
  diffMoves,
  locate,
  planMove,
  stepTarget,
} from '../lib/risen/work-board.ts';
import type { WorkItem, WorkStatus } from '../lib/risen/types.ts';

/**
 * A dragged card is the easiest place in this app to lose data: the wrong plan
 * silently renumbers the wrong column, and nobody notices until an order looks
 * arbitrary a week later. These cases pin the arithmetic down.
 */

let counter = 0;
const task = (over: Partial<WorkItem> = {}): WorkItem => ({
  id: `w${(counter += 1)}`,
  projectId: 'barn',
  placeId: null,
  milestoneId: null,
  parentId: null,
  title: 'Oppgave',
  detail: null,
  type: 'task',
  priority: 'normal',
  status: 'ready',
  assignee: null,
  estimatedHours: null,
  requiredPeople: null,
  suitableForDugnad: false,
  weatherDependency: null,
  startAt: null,
  dueDate: null,
  position: 0,
  visibility: 'members',
  ...over,
});

/** Three cards in `ready`, two in `planned`, positions already tidy. */
function board() {
  const items = [
    task({ id: 'r0', status: 'ready', position: 0, title: 'Ready null' }),
    task({ id: 'r1', status: 'ready', position: 1, title: 'Ready en' }),
    task({ id: 'r2', status: 'ready', position: 2, title: 'Ready to' }),
    task({ id: 'p0', status: 'planned', position: 0, title: 'Planlagt null' }),
    task({ id: 'p1', status: 'planned', position: 1, title: 'Planlagt en' }),
  ];
  return { items, columns: boardColumns(items) };
}

const order = (columns: ReturnType<typeof boardColumns>, status: WorkStatus) =>
  columns.find(column => column.status === status)!.items.map(item => item.id);

describe('boardColumns', () => {
  it('keeps empty columns, because an empty column is the one you need to drop into', () => {
    const columns = boardColumns([task({ status: 'ready' })]);
    assert.deepEqual(columns.map(column => column.status), BOARD_STATUSES);
    assert.equal(columns.find(column => column.status === 'blocked')!.items.length, 0);
  });

  it('leaves cancelled off the board until something is actually cancelled', () => {
    assert.equal(boardColumns([task({ status: 'ready' })]).some(c => c.status === 'cancelled'), false);
    assert.equal(boardColumns([task({ status: 'cancelled' })]).some(c => c.status === 'cancelled'), true);
  });

  it('orders a column by position, falling back to title so the order is never arbitrary', () => {
    const columns = boardColumns([
      task({ id: 'b', status: 'ready', position: 0, title: 'Bjelke' }),
      task({ id: 'a', status: 'ready', position: 0, title: 'Antenne' }),
    ]);
    assert.deepEqual(order(columns, 'ready'), ['a', 'b']);
  });
});

describe('planMove', () => {
  it('writes nothing when a card is dropped exactly where it already was', () => {
    const { columns } = board();
    assert.deepEqual(planMove(columns, 'r1', 'ready', 1), []);
  });

  it('renumbers only the cards that actually shift when reordering in place', () => {
    const { columns } = board();
    const moves = planMove(columns, 'r2', 'ready', 0);
    assert.deepEqual(
      moves.map(move => [move.id, move.position]).sort(),
      [['r0', 1], ['r1', 2], ['r2', 0]].sort(),
    );
    assert.ok(moves.every(move => move.status === 'ready'));
  });

  it('moves a card to another column and renumbers both sides', () => {
    const { items, columns } = board();
    const moves = planMove(columns, 'r0', 'planned', 1);
    const after = boardColumns(applyMoves(items, moves));
    assert.deepEqual(order(after, 'planned'), ['p0', 'r0', 'p1']);
    assert.deepEqual(order(after, 'ready'), ['r1', 'r2']);
  });

  it('writes the moved card even when its index happens not to change', () => {
    const { columns } = board();
    const moves = planMove(columns, 'r0', 'planned', 0);
    const self = moves.find(move => move.id === 'r0');
    assert.ok(self, 'the status change must be written');
    assert.equal(self.status, 'planned');
  });

  it('accepts a drop past the end of a column instead of dropping the card', () => {
    const { items, columns } = board();
    const after = boardColumns(applyMoves(items, planMove(columns, 'r0', 'planned', 99)));
    assert.deepEqual(order(after, 'planned'), ['p0', 'p1', 'r0']);
  });

  it('accepts a negative index the same way', () => {
    const { items, columns } = board();
    const after = boardColumns(applyMoves(items, planMove(columns, 'r2', 'ready', -3)));
    assert.deepEqual(order(after, 'ready'), ['r2', 'r0', 'r1']);
  });

  it('repairs positions that have collided rather than preserving the collision', () => {
    const items = [
      task({ id: 'a', status: 'ready', position: 5, title: 'A' }),
      task({ id: 'b', status: 'ready', position: 5, title: 'B' }),
      task({ id: 'c', status: 'ready', position: 5, title: 'C' }),
    ];
    const after = applyMoves(items, planMove(boardColumns(items), 'c', 'ready', 0));
    assert.deepEqual(after.map(item => item.position).sort(), [0, 1, 2]);
  });

  it('leaves untouched columns alone', () => {
    const { columns } = board();
    const moves = planMove(columns, 'r0', 'planned', 0);
    assert.equal(moves.some(move => move.status === 'inbox'), false);
  });

  it('returns nothing for a card that is not on the board', () => {
    const { columns } = board();
    assert.deepEqual(planMove(columns, 'ghost', 'ready', 0), []);
  });

  it('is idempotent: replanning the same move writes nothing the second time', () => {
    const { items, columns } = board();
    const first = planMove(columns, 'r2', 'planned', 0);
    const after = boardColumns(applyMoves(items, first));
    assert.deepEqual(planMove(after, 'r2', 'planned', 0), []);
  });
});

describe('locate', () => {
  it('finds a card by column and index', () => {
    const { columns } = board();
    assert.deepEqual(locate(columns, 'p1'), { status: 'planned', index: 1 });
  });

  it('returns null for an unknown card', () => {
    assert.equal(locate(board().columns, 'ghost'), null);
  });
});

describe('stepTarget', () => {
  it('moves within a column with up and down', () => {
    const { columns } = board();
    assert.deepEqual(stepTarget(columns, 'r1', 'up'), { status: 'ready', index: 0 });
    assert.deepEqual(stepTarget(columns, 'r1', 'down'), { status: 'ready', index: 2 });
  });

  it('refuses to step off the top or bottom of a column', () => {
    const { columns } = board();
    assert.equal(stepTarget(columns, 'r0', 'up'), null);
    assert.equal(stepTarget(columns, 'r2', 'down'), null);
  });

  it('keeps the same index when crossing into a column that is long enough', () => {
    const { columns } = board();
    assert.deepEqual(stepTarget(columns, 'r1', 'left'), { status: 'planned', index: 1 });
  });

  it('lands at the end of a shorter column rather than out of bounds', () => {
    const { columns } = board();
    assert.deepEqual(stepTarget(columns, 'r2', 'left'), { status: 'planned', index: 2 });
  });

  it('refuses to step off either edge of the board', () => {
    const items = [task({ id: 'i', status: 'inbox', position: 0 }), task({ id: 'd', status: 'done', position: 0 })];
    const columns = boardColumns(items);
    assert.equal(stepTarget(columns, 'i', 'left'), null);
    assert.equal(stepTarget(columns, 'd', 'right'), null);
  });

  it('steps through every column in order, ending where the board ends', () => {
    const items = [task({ id: 'x', status: 'inbox', position: 0 })];
    let columns = boardColumns(items);
    let current = items;
    const visited: string[] = ['inbox'];
    for (let i = 0; i < 10; i += 1) {
      const next = stepTarget(columns, 'x', 'right');
      if (!next) break;
      current = applyMoves(current, planMove(columns, 'x', next.status, next.index));
      columns = boardColumns(current);
      visited.push(next.status);
    }
    assert.deepEqual(visited, BOARD_STATUSES);
  });
});

describe('diffMoves', () => {
  it('is empty when nothing moved, so a drop that changes nothing writes nothing', () => {
    const { items } = board();
    assert.deepEqual(diffMoves(items, items), []);
  });

  it('collapses several keyboard steps into the writes they add up to', () => {
    const { items } = board();
    let current = items;
    // Three steps right: ready -> in_progress -> blocked -> done.
    for (const status of ['in_progress', 'blocked', 'done'] as WorkStatus[]) {
      current = applyMoves(current, planMove(boardColumns(current), 'r0', status, 0));
    }
    const moves = diffMoves(items, current);
    const self = moves.find(move => move.id === 'r0');
    assert.equal(self?.status, 'done', 'only the destination is written, not the path');
    assert.equal(moves.filter(move => move.id === 'r0').length, 1);
  });

  it('includes the siblings a move renumbered', () => {
    const { items } = board();
    const after = applyMoves(items, planMove(boardColumns(items), 'r2', 'ready', 0));
    assert.deepEqual(diffMoves(items, after).map(move => move.id).sort(), ['r0', 'r1', 'r2']);
  });

  it('ignores items that were not in the original set', () => {
    const { items } = board();
    assert.deepEqual(diffMoves(items, [...items, task({ id: 'new', status: 'done', position: 0 })]), []);
  });
});
