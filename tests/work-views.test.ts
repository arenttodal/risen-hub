import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyFilters,
  findView,
  groupWorkItems,
  savedViews,
  selectWorkItems,
  sortWorkItems,
  workSummary,
  type ViewContext,
} from '../lib/risen/work-views.ts';
import type { WorkItem } from '../lib/risen/types.ts';

const ctx: ViewContext = { today: '2026-09-20', currentPerson: 'Arn' };

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

describe('saved views', () => {
  it('are filters over one dataset, so an item can appear in several at once', () => {
    const urgentPurchase = task({ type: 'purchase', priority: 'urgent', status: 'ready' });
    const items = [urgentPurchase];
    const appearsIn = savedViews
      .filter(view => selectWorkItems(items, view, {}, ctx).length === 1)
      .map(view => view.key);
    assert.ok(appearsIn.includes('all'));
    assert.ok(appearsIn.includes('purchases'));
    assert.ok(appearsIn.includes('attention'));
    // Still exactly one record, not three copies.
    assert.equal(new Set(items.map(item => item.id)).size, 1);
  });

  it('hides completed work everywhere except the completed view', () => {
    const items = [task({ status: 'done' })];
    assert.equal(selectWorkItems(items, findView('all'), {}, ctx).length, 0);
    assert.equal(selectWorkItems(items, findView('completed'), {}, ctx).length, 1);
  });

  it('shows completed work when explicitly asked', () => {
    const items = [task({ status: 'done' })];
    assert.equal(selectWorkItems(items, findView('all'), { showCompleted: true }, ctx).length, 1);
  });

  it('treats cancelled as closed, not as open work', () => {
    const items = [task({ status: 'cancelled' })];
    assert.equal(selectWorkItems(items, findView('all'), {}, ctx).length, 0);
  });

  it('keeps subtasks out of the master list', () => {
    const items = [task({ id: 'parent' }), task({ parentId: 'parent' })];
    const listed = selectWorkItems(items, findView('all'), {}, ctx);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, 'parent');
  });

  it('counts an overdue item as due today, not as upcoming only', () => {
    const items = [task({ dueDate: '2026-09-01' })];
    assert.equal(selectWorkItems(items, findView('today'), {}, ctx).length, 1);
  });

  it('includes the next seven days but not the eighth', () => {
    const items = [task({ dueDate: '2026-09-27' }), task({ dueDate: '2026-09-28' })];
    const upcoming = selectWorkItems(items, findView('upcoming'), {}, ctx);
    assert.deepEqual(upcoming.map(item => item.dueDate), ['2026-09-27']);
  });

  it('returns nothing for "mine" until there is a signed-in person', () => {
    const items = [task({ assignee: 'Arn' })];
    assert.equal(selectWorkItems(items, findView('mine'), {}, ctx).length, 1);
    assert.equal(
      selectWorkItems(items, findView('mine'), {}, { ...ctx, currentPerson: null }).length,
      0,
    );
  });

  it('picks up dugnad candidates by flag or by type', () => {
    const items = [task({ suitableForDugnad: true }), task({ type: 'dugnad' }), task()];
    assert.equal(selectWorkItems(items, findView('dugnad'), {}, ctx).length, 2);
  });
});

describe('filters', () => {
  it('narrow without duplicating', () => {
    const items = [task({ projectId: 'barn' }), task({ projectId: 'wall' })];
    const filtered = applyFilters(items, { projectId: 'barn' });
    assert.equal(filtered.length, 1);
    assert.equal(new Set(filtered.map(i => i.id)).size, filtered.length);
  });

  it('search covers title and detail, case-insensitively', () => {
    const items = [task({ title: 'Male vinduskarmer' }), task({ detail: 'Trenger MALING' })];
    assert.equal(applyFilters(items, { query: 'mal' }).length, 2);
  });

  it('combine as AND, not OR', () => {
    const items = [
      task({ projectId: 'barn', type: 'purchase' }),
      task({ projectId: 'barn', type: 'task' }),
    ];
    assert.equal(applyFilters(items, { projectId: 'barn', type: 'purchase' }).length, 1);
  });
});

describe('sorting', () => {
  it('orders by priority', () => {
    const items = [task({ priority: 'low' }), task({ priority: 'urgent' }), task({ priority: 'normal' })];
    assert.deepEqual(sortWorkItems(items, 'priority').map(i => i.priority), ['urgent', 'normal', 'low']);
  });

  it('sinks undated work below dated work', () => {
    const items = [task({ dueDate: null }), task({ dueDate: '2026-10-01' })];
    assert.deepEqual(sortWorkItems(items, 'due').map(i => i.dueDate), ['2026-10-01', null]);
  });

  it('does not mutate the input array', () => {
    const items = [task({ priority: 'low' }), task({ priority: 'urgent' })];
    const before = items.map(i => i.id);
    sortWorkItems(items, 'priority');
    assert.deepEqual(items.map(i => i.id), before);
  });
});

describe('grouping', () => {
  const names = new Map([['barn', 'Låven'], ['wall', 'Steinmuren']]);

  it('groups by status in the order work actually moves', () => {
    const items = [task({ status: 'ready' }), task({ status: 'inbox' }), task({ status: 'blocked' })];
    assert.deepEqual(groupWorkItems(items, 'status', ctx, names).map(g => g.key), ['inbox', 'ready', 'blocked']);
  });

  it('drops empty status groups rather than showing noise', () => {
    const items = [task({ status: 'ready' })];
    assert.equal(groupWorkItems(items, 'status', ctx, names).length, 1);
  });

  it('tells a status group what to inherit on create', () => {
    const items = [task({ status: 'blocked' })];
    assert.equal(groupWorkItems(items, 'status', ctx, names)[0].inheritStatus, 'blocked');
  });

  it('names project groups and keeps unassigned work separate', () => {
    const items = [task({ projectId: 'barn' }), task({ projectId: null })];
    const groups = groupWorkItems(items, 'project', ctx, names);
    assert.deepEqual(groups.map(g => g.label).sort(), ['Låven', 'Uten prosjekt']);
  });

  it('puts overdue work first when grouping by date', () => {
    const items = [task({ dueDate: null }), task({ dueDate: '2026-09-01' }), task({ dueDate: '2026-09-20' })];
    assert.deepEqual(groupWorkItems(items, 'due', ctx, names).map(g => g.key), ['overdue', 'today', 'none']);
  });

  it('never loses an item while grouping', () => {
    const items = [task({ status: 'inbox' }), task({ status: 'ready' }), task({ status: 'blocked' })];
    for (const key of ['status', 'project', 'assignee', 'due', 'priority', 'none'] as const) {
      const total = groupWorkItems(items, key, ctx, names).reduce((sum, g) => sum + g.items.length, 0);
      assert.equal(total, items.length, `grouping by ${key} changed the count`);
    }
  });
});

describe('workSummary', () => {
  it('counts open, ready and attention without double counting subtasks', () => {
    const items = [
      task({ id: 'p', status: 'ready' }),
      task({ parentId: 'p', status: 'ready' }),
      task({ status: 'blocked' }),
      task({ status: 'done' }),
    ];
    const summary = workSummary(items, ctx);
    assert.equal(summary.open, 2);
    assert.equal(summary.ready, 1);
    assert.equal(summary.attention, 1);
  });

  it('counts an overdue item as needing attention', () => {
    const summary = workSummary([task({ dueDate: '2026-09-01' })], ctx);
    assert.equal(summary.overdue, 1);
    assert.equal(summary.attention, 1);
  });
});
