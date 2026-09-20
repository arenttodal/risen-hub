import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { byPriority, fundedShare, isOpenWork, PRIORITY_RANK } from '../lib/risen/types.ts';
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
    for (const status of ['inbox', 'ready', 'doing', 'blocked'] as const) {
      assert.equal(isOpenWork({ status }), true, `${status} should count as open`);
    }
    assert.equal(isOpenWork({ status: 'done' }), false);
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
