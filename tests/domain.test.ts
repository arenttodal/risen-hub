import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readableSummary } from '../lib/risen/format.ts';
import {
  byPriority,
  fundedShare,
  isOpenWork,
  isPublished,
  isVerified,
  PRIORITY_RANK,
  subtaskProgress,
} from '../lib/risen/types.ts';
import type { WorkPriority } from '../lib/risen/types.ts';

describe('fundedShare', () => {
  it('returns the percentage of the budget covered', () => {
    assert.equal(fundedShare({ budgetNok: 400_000, fundedNok: 168_000 }), 42);
  });

  it('returns 0 rather than dividing by zero when no budget is set', () => {
    assert.equal(fundedShare({ budgetNok: 0, fundedNok: 50_000 }), 0);
  });

  it('never reports more than 100 percent, even when over-funded', () => {
    assert.equal(fundedShare({ budgetNok: 100_000, fundedNok: 250_000 }), 100);
  });

  it('never reports a negative share', () => {
    assert.equal(fundedShare({ budgetNok: 100_000, fundedNok: -5_000 }), 0);
  });
});

describe('isOpenWork', () => {
  it('treats every status except done as open', () => {
    for (const status of ['inbox', 'planned', 'ready', 'in_progress', 'blocked'] as const) {
      assert.equal(isOpenWork({ status }), true, `${status} should count as open`);
    }
    assert.equal(isOpenWork({ status: 'done' }), false);
    assert.equal(isOpenWork({ status: 'cancelled' }), false, 'cancelled closes an item too');
  });
});

describe('byPriority', () => {
  it('sorts urgent work first and low work last', () => {
    const items = [
      { priority: 'low' as WorkPriority },
      { priority: 'urgent' as WorkPriority },
      { priority: 'normal' as WorkPriority },
      { priority: 'high' as WorkPriority },
    ];
    assert.deepEqual(
      items.slice().sort(byPriority).map(item => item.priority),
      ['urgent', 'high', 'normal', 'low'],
    );
  });

  it('ranks every priority the domain allows', () => {
    assert.deepEqual(Object.keys(PRIORITY_RANK).sort(), ['high', 'low', 'normal', 'urgent']);
  });
});

describe('isVerified', () => {
  it('requires status, source and date together', () => {
    assert.equal(isVerified({ status: 'verified', sourceUrl: 'https://x', verifiedAt: '2026-09-01' }), true);
  });

  it('rejects a verified status with no source or date', () => {
    assert.equal(isVerified({ status: 'verified', sourceUrl: null, verifiedAt: '2026-09-01' }), false);
    assert.equal(isVerified({ status: 'verified', sourceUrl: 'https://x', verifiedAt: null }), false);
  });

  it('rejects research that has a source but was never verified', () => {
    assert.equal(isVerified({ status: 'unverified', sourceUrl: 'https://x', verifiedAt: '2026-09-01' }), false);
  });
});

describe('isPublished', () => {
  it('needs public visibility and an explicit publish date', () => {
    assert.equal(isPublished({ visibility: 'public', publishedAt: '2026-05-04T09:00:00.000Z' }), true);
  });

  it('does not publish a project merely marked public', () => {
    assert.equal(isPublished({ visibility: 'public', publishedAt: null }), false);
  });

  it('never publishes a private or members-only project', () => {
    assert.equal(isPublished({ visibility: 'members', publishedAt: '2026-05-04T09:00:00.000Z' }), false);
    assert.equal(isPublished({ visibility: 'private', publishedAt: '2026-05-04T09:00:00.000Z' }), false);
  });
});

describe('subtaskProgress', () => {
  it('counts completed against total', () => {
    const progress = subtaskProgress([
      { status: 'done' },
      { status: 'done' },
      { status: 'ready' },
      { status: 'inbox' },
    ]);
    assert.equal(progress.done, 2);
    assert.equal(progress.total, 4);
  });

  it('excludes cancelled subtasks from the total, so progress is not punished for dropping work', () => {
    const progress = subtaskProgress([{ status: 'done' }, { status: 'cancelled' }]);
    assert.equal(progress.done, 1);
    assert.equal(progress.total, 1);
  });

  it('reports zero of zero rather than dividing by nothing', () => {
    const progress = subtaskProgress([]);
    assert.equal(progress.total, 0);
    assert.equal(progress.done, 0);
  });

  it('carries a text label, so progress is not conveyed by a bar alone', () => {
    assert.match(subtaskProgress([{ status: 'done' }]).label, /1 av 1/);
  });
});

describe('readableSummary', () => {
  it('reads a stored status transition back in Norwegian', () => {
    assert.equal(
      readableSummary('Reparer kjøkkendør: planned → inbox'),
      'Reparer kjøkkendør: Planlagt → Innboks',
    );
  });

  it('knows the retired `doing` status older rows still carry', () => {
    assert.equal(readableSummary('X: doing → done'), 'X: Pågår → Ferdig');
  });

  it('leaves a summary that is already Norwegian alone', () => {
    const already = 'Reparer kjøkkendør: Planlagt → Innboks';
    assert.equal(readableSummary(already), already);
  });

  it('leaves an ordinary sentence alone', () => {
    assert.equal(readableSummary('Innkjøpsliste opprettet: Materialer'), 'Innkjøpsliste opprettet: Materialer');
  });

  it('does not rewrite a pair it only half recognises', () => {
    assert.equal(readableSummary('X: planned → forever'), 'X: planned → forever');
  });

  it('only touches the arrow pair at the end, so a task named after a status keeps its name', () => {
    assert.equal(readableSummary('done'), 'done');
    assert.equal(readableSummary('Rydde done-mappa oppdatert'), 'Rydde done-mappa oppdatert');
  });
});
