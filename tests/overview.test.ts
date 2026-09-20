import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chooseFocus,
  daysBetween,
  needsClarification,
  overviewMetrics,
  projectsInMotion,
  upcomingDeadlines,
  type OverviewContext,
} from '../lib/risen/overview.ts';
import type { FundingScheme, Project, WorkItem } from '../lib/risen/types.ts';

/**
 * The page this covers used to open with a hand-written sentence no data
 * supported. These cases are the replacement for that sentence: the headline is
 * now a claim the records have to earn.
 */

const ctx: OverviewContext = { today: '2026-09-20' };

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

let schemeCounter = 0;
const scheme = (over: Partial<FundingScheme> = {}): FundingScheme => ({
  id: `s${(schemeCounter += 1)}`,
  name: 'Ordning',
  provider: 'Et fond',
  sourceUrl: null,
  eligibilitySummary: null,
  deadlineAt: null,
  verifiedAt: null,
  status: 'unverified',
  projectId: null,
  visibility: 'members',
  ...over,
});

const project = (over: Partial<Project> = {}): Project => ({
  id: 'barn',
  slug: 'barn',
  name: 'Låven',
  summary: null,
  category: 'Kulturarena',
  status: 'active',
  progress: 0,
  budgetNok: 0,
  fundedNok: 0,
  nextAction: null,
  placeId: null,
  visibility: 'members',
  publishedAt: null,
  ...over,
});

describe('chooseFocus', () => {
  it('puts something already late above something merely soon', () => {
    const focus = chooseFocus(
      [task({ title: 'Tette taket', dueDate: '2026-09-10' })],
      [scheme({ name: 'ARENA', deadlineAt: '2026-09-22' })],
      ctx,
    );
    assert.equal(focus.kind, 'overdue');
    assert.match(focus.headline, /Tette taket/);
    assert.match(focus.headline, /10 dager/);
  });

  it('counts a single overdue day in the singular', () => {
    const focus = chooseFocus([task({ dueDate: '2026-09-19' })], [], ctx);
    assert.match(focus.headline, /1 dag over/);
  });

  it('puts a near deadline above a blocker, because the farm cannot move it', () => {
    const focus = chooseFocus(
      [task({ title: 'Står fast', status: 'blocked' })],
      [scheme({ name: 'Kulturrom', deadlineAt: '2026-10-01' })],
      ctx,
    );
    assert.equal(focus.kind, 'deadline');
    assert.match(focus.headline, /Kulturrom har frist om 11 dager/);
  });

  it('says plainly when a near deadline has not been verified', () => {
    const focus = chooseFocus([], [scheme({ deadlineAt: '2026-09-25' })], ctx);
    assert.match(focus.detail, /ikke bekreftet/);
  });

  it('does not hedge a deadline someone has actually verified', () => {
    const focus = chooseFocus(
      [],
      [scheme({ deadlineAt: '2026-09-25', status: 'verified', sourceUrl: 'https://x.test', verifiedAt: '2026-09-19' })],
      ctx,
    );
    assert.match(focus.detail, /bekreftet mot/);
    assert.equal(/ikke bekreftet/.test(focus.detail), false);
  });

  it('ignores a deadline further out than the horizon', () => {
    const focus = chooseFocus(
      [task({ title: 'Står fast', status: 'blocked' })],
      [scheme({ deadlineAt: '2027-05-01' })],
      ctx,
    );
    assert.equal(focus.kind, 'blocked');
  });

  it('never leads with a deadline that has already passed', () => {
    const focus = chooseFocus([], [scheme({ deadlineAt: '2026-09-15', status: 'passed' })], ctx);
    assert.notEqual(focus.kind, 'deadline');
  });

  it('falls back to verifying research when nothing is late, stuck or near', () => {
    const focus = chooseFocus([task({ status: 'ready' })], [scheme({ deadlineAt: '2027-05-01' })], ctx);
    assert.equal(focus.kind, 'unverified');
    assert.match(focus.headline, /1 av 1 ordninger er ikke bekreftet/);
  });

  it('offers ready work once the research is sound', () => {
    const verified = scheme({
      deadlineAt: '2027-05-01',
      status: 'verified',
      sourceUrl: 'https://x.test',
      verifiedAt: '2026-09-19',
    });
    const focus = chooseFocus([task({ title: 'Rydde tunet', status: 'ready' })], [verified], ctx);
    assert.equal(focus.kind, 'ready');
    assert.match(focus.headline, /Rydde tunet/);
  });

  it('points at the inbox when nothing is ready but something is unsorted', () => {
    const focus = chooseFocus([task({ status: 'inbox' })], [], ctx);
    assert.equal(focus.kind, 'inbox');
    assert.match(focus.action.href, /filter=inbox/);
  });

  it('says so calmly when there is genuinely nothing pressing', () => {
    const focus = chooseFocus([task({ status: 'done' })], [], ctx);
    assert.equal(focus.kind, 'clear');
  });

  it('ignores finished and cancelled work entirely', () => {
    const focus = chooseFocus(
      [task({ status: 'done', dueDate: '2026-01-01' }), task({ status: 'cancelled', dueDate: '2026-01-01' })],
      [],
      ctx,
    );
    assert.equal(focus.kind, 'clear');
  });

  it('always offers an action that goes somewhere', () => {
    const cases = [
      chooseFocus([task({ dueDate: '2026-01-01' })], [], ctx),
      chooseFocus([], [scheme({ deadlineAt: '2026-09-25' })], ctx),
      chooseFocus([task({ status: 'blocked' })], [], ctx),
      chooseFocus([], [], ctx),
    ];
    for (const focus of cases) {
      assert.match(focus.action.href, /^\/hub\//, focus.kind);
      assert.ok(focus.action.label.length > 0);
      assert.ok(focus.headline.length > 0 && focus.detail.length > 0);
    }
  });
});

describe('overviewMetrics', () => {
  it('reports the next deadline rather than a funding total', () => {
    const metrics = overviewMetrics(
      [project()],
      [task()],
      [scheme({ name: 'Kulturrom', deadlineAt: '2026-10-01' }), scheme({ deadlineAt: '2027-05-01' })],
      ctx,
    );
    assert.deepEqual(metrics.nextDeadline, { name: 'Kulturrom', days: 11, verified: false });
  });

  it('has no next deadline when every deadline is behind us', () => {
    const metrics = overviewMetrics([], [], [scheme({ deadlineAt: '2026-09-01', status: 'passed' })], ctx);
    assert.equal(metrics.nextDeadline, null);
  });

  it('counts each item needing attention once, however many reasons it has', () => {
    const metrics = overviewMetrics(
      [],
      [task({ status: 'blocked', priority: 'urgent', dueDate: '2026-01-01' })],
      [],
      ctx,
    );
    assert.equal(metrics.needsAttention, 1);
  });

  it('does not count finished work as open or as needing attention', () => {
    const metrics = overviewMetrics([], [task({ status: 'done', priority: 'urgent' })], [], ctx);
    assert.equal(metrics.openWork, 0);
    assert.equal(metrics.needsAttention, 0);
  });
});

describe('projectsInMotion', () => {
  it('measures motion by open work, not by a status label', () => {
    const idle = project({ id: 'idle', name: 'Hvilende', status: 'active' });
    const busy = project({ id: 'busy', name: 'I gang', status: 'paused' });
    const moving = projectsInMotion([idle, busy], [task({ projectId: 'busy' })]);
    assert.deepEqual(moving.map(p => p.id), ['busy']);
  });

  it('orders by how much is open', () => {
    const a = project({ id: 'a' });
    const b = project({ id: 'b' });
    const work = [task({ projectId: 'a' }), task({ projectId: 'b' }), task({ projectId: 'b' })];
    assert.deepEqual(projectsInMotion([a, b], work).map(p => p.id), ['b', 'a']);
  });

  it('ignores work with no project rather than crediting one', () => {
    assert.deepEqual(projectsInMotion([project()], [task({ projectId: null })]), []);
  });
});

describe('needsClarification', () => {
  it('lists a blocker before an unplanned item', () => {
    const rows = needsClarification(
      [task({ title: 'Uavklart', status: 'inbox' }), task({ title: 'Fast', status: 'blocked' })],
      ctx,
    );
    assert.deepEqual(rows.map(row => row.title), ['Fast', 'Uavklart']);
  });

  it('names an item once, under its most serious reason', () => {
    const rows = needsClarification([task({ status: 'blocked', dueDate: '2026-01-01' })], ctx);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reason, 'Blokkert');
  });

  it('distinguishes an item with no project from one that is merely unplanned', () => {
    const rows = needsClarification(
      [task({ status: 'inbox', projectId: null }), task({ status: 'inbox', projectId: 'barn' })],
      ctx,
    );
    assert.deepEqual(rows.map(row => row.reason).sort(), ['Ikke planlagt', 'Uten prosjekt']);
  });

  it('is empty when nothing is waiting on a decision', () => {
    assert.deepEqual(needsClarification([task({ status: 'ready' })], ctx), []);
  });
});

describe('daysBetween', () => {
  it('handles a date-only and a timestamped value the same way', () => {
    assert.equal(daysBetween('2026-09-20', '2026-09-25'), 5);
    assert.equal(daysBetween('2026-09-20', '2026-09-25T13:00:00+02:00'), 5);
  });

  it('is negative once the date has passed, and null when there is none', () => {
    assert.equal(daysBetween('2026-09-20', '2026-09-15'), -5);
    assert.equal(daysBetween('2026-09-20', null), null);
  });
});

describe('upcomingDeadlines', () => {
  it('keeps only future deadlines, soonest first', () => {
    const rows = upcomingDeadlines(
      [
        scheme({ name: 'Sent', deadlineAt: '2027-05-01' }),
        scheme({ name: 'Snart', deadlineAt: '2026-10-01' }),
        scheme({ name: 'Utløpt', deadlineAt: '2026-09-01', status: 'passed' }),
        scheme({ name: 'Uten frist' }),
      ],
      ctx,
    );
    assert.deepEqual(rows.map(row => row.scheme.name), ['Snart', 'Sent']);
  });

  it('counts today as still upcoming', () => {
    const rows = upcomingDeadlines([scheme({ deadlineAt: '2026-09-20' })], ctx);
    assert.equal(rows[0]?.days, 0);
  });
});
