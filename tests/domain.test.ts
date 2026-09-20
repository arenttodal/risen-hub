import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  byPriority,
  fundedShare,
  isOpenWork,
  isPublished,
  isVerified,
  PRIORITY_RANK,
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
