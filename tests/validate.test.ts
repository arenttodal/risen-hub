import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseNewShoppingList,
  parseNewWorkItem,
  parseProjectPatch,
  parseShoppingItem,
  parseShoppingItemPatch,
  parseWorkItemPatch,
} from '../lib/risen/validate.ts';

/**
 * These guard the only place untrusted input reaches the database. A gap here
 * is a gap in the API routes, so the cases below are the ones a bad or careless
 * request would actually send.
 */

describe('parseNewWorkItem', () => {
  it('accepts a title alone and fills safe defaults', () => {
    const result = parseNewWorkItem({ title: '  Reparer kjøkkendør  ' });
    assert.ok(result.ok);
    assert.equal(result.value.title, 'Reparer kjøkkendør');
    assert.equal(result.value.type, 'task');
    assert.equal(result.value.priority, 'normal');
    // No project means the inbox, not a guess.
    assert.equal(result.value.status, 'inbox');
    assert.equal(result.value.projectId, null);
  });

  it('rejects a missing or whitespace-only title', () => {
    for (const title of [undefined, '', '   ']) {
      const result = parseNewWorkItem({ title });
      assert.equal(result.ok, false, `title ${JSON.stringify(title)} should be rejected`);
    }
  });

  it('rejects a title beyond the column length', () => {
    assert.equal(parseNewWorkItem({ title: 'x'.repeat(201) }).ok, false);
  });

  it('rejects values outside the allowed enums', () => {
    const result = parseNewWorkItem({ title: 'x', type: 'demolish', priority: 'critical' });
    assert.equal(result.ok, false);
    assert.equal(result.errors.length, 2);
  });

  it('rejects a date that looks right but cannot exist', () => {
    assert.equal(parseNewWorkItem({ title: 'x', dueDate: '2026-02-31' }).ok, false);
    assert.equal(parseNewWorkItem({ title: 'x', dueDate: '31-02-2026' }).ok, false);
    assert.ok(parseNewWorkItem({ title: 'x', dueDate: '2026-02-28' }).ok);
  });

  it('ignores fields it does not know about rather than writing them', () => {
    const result = parseNewWorkItem({ title: 'x', id: 'injected', createdAt: '1999-01-01' });
    assert.ok(result.ok);
    assert.equal('id' in result.value, false);
    assert.equal('createdAt' in result.value, false);
  });

  it('rejects input that is not an object', () => {
    for (const input of [null, 'string', 42, ['a']]) {
      assert.equal(parseNewWorkItem(input).ok, false);
    }
  });

  it('keeps estimated hours within a sane range', () => {
    assert.ok(parseNewWorkItem({ title: 'x', estimatedHours: 4 }).ok);
    assert.equal(parseNewWorkItem({ title: 'x', estimatedHours: -1 }).ok, false);
    assert.equal(parseNewWorkItem({ title: 'x', estimatedHours: 1.5 }).ok, false);
  });
});

describe('parseWorkItemPatch', () => {
  it('returns only the fields that were sent, so a patch never blanks the rest', () => {
    const result = parseWorkItemPatch({ status: 'ready' });
    assert.ok(result.ok);
    assert.deepEqual(Object.keys(result.value), ['status']);
  });

  it('allows clearing an assignee explicitly', () => {
    const result = parseWorkItemPatch({ assignee: null });
    assert.ok(result.ok);
    assert.equal(result.value.assignee, null);
  });

  it('refuses an empty patch', () => {
    assert.equal(parseWorkItemPatch({}).ok, false);
  });

  it('refuses an unknown status', () => {
    assert.equal(parseWorkItemPatch({ status: 'archived' }).ok, false);
  });
});

describe('parseProjectPatch', () => {
  it('holds progress to 0-100', () => {
    assert.ok(parseProjectPatch({ progress: 0 }).ok);
    assert.ok(parseProjectPatch({ progress: 100 }).ok);
    assert.equal(parseProjectPatch({ progress: 101 }).ok, false);
    assert.equal(parseProjectPatch({ progress: -5 }).ok, false);
  });

  it('does not accept publishing through an ordinary field edit', () => {
    const result = parseProjectPatch({ publishedAt: '2026-01-01', visibility: 'public' });
    assert.equal(result.ok, false, 'no recognised fields, so nothing to update');
  });
});

describe('parseShoppingItem', () => {
  it('converts a kroner string to whole øre at the boundary', () => {
    const result = parseShoppingItem({ name: 'Sement', estimatedUnitPrice: '289,90' });
    assert.ok(result.ok);
    assert.equal(result.value.estimatedUnitPriceOre, 28990);
  });

  it('accepts a space-grouped amount, because that is how Norwegian prices are written', () => {
    const result = parseShoppingItem({ name: 'Gravemaskin', estimatedUnitPrice: '12 500,50' });
    assert.ok(result.ok);
    assert.equal(result.value.estimatedUnitPriceOre, 1250050);
  });

  it('scales quantity by 1000 and keeps three decimals', () => {
    const result = parseShoppingItem({ name: 'Bord', quantity: '2,5' });
    assert.ok(result.ok);
    assert.equal(result.value.quantityMilli, 2500);
  });

  it('defaults to one unit of stk when quantity is left out', () => {
    const result = parseShoppingItem({ name: 'Hengelås' });
    assert.ok(result.ok);
    assert.equal(result.value.quantityMilli, 1000);
    assert.equal(result.value.unit, 'stk');
    assert.equal(result.value.status, 'planned');
  });

  it('refuses a quantity of zero, which would silently cost nothing', () => {
    assert.equal(parseShoppingItem({ name: 'Spiker', quantity: '0' }).ok, false);
  });

  it('refuses a negative quantity', () => {
    assert.equal(parseShoppingItem({ name: 'Spiker', quantity: '-3' }).ok, false);
  });

  it('refuses a price with more than two decimals rather than rounding it quietly', () => {
    assert.equal(parseShoppingItem({ name: 'Skruer', estimatedUnitPrice: '19,999' }).ok, false);
  });

  it('requires a product name', () => {
    assert.equal(parseShoppingItem({ estimatedUnitPrice: '100' }).ok, false);
  });

  it('refuses a status outside the five known ones', () => {
    assert.equal(parseShoppingItem({ name: 'Maling', status: 'ordered' }).ok, false);
  });

  it('treats an empty price as no price rather than as zero', () => {
    const result = parseShoppingItem({ name: 'Ukjent', estimatedUnitPrice: '' });
    assert.ok(result.ok);
    assert.equal(result.value.estimatedUnitPriceOre, null);
  });
});

describe('parseShoppingItemPatch', () => {
  it('patches only the fields that were sent', () => {
    const result = parseShoppingItemPatch({ status: 'purchased' });
    assert.ok(result.ok);
    assert.deepEqual(Object.keys(result.value), ['status']);
  });

  it('allows clearing an actual price explicitly', () => {
    const result = parseShoppingItemPatch({ actualUnitPrice: null });
    assert.ok(result.ok);
    assert.equal(result.value.actualUnitPriceOre, null);
  });

  it('refuses an empty patch', () => {
    assert.equal(parseShoppingItemPatch({}).ok, false);
  });

  it('drops fields it does not recognise instead of writing them', () => {
    const result = parseShoppingItemPatch({ status: 'ready', purchasedBy: 'someone' });
    assert.ok(result.ok);
    assert.deepEqual(Object.keys(result.value), ['status']);
  });
});

describe('parseNewShoppingList', () => {
  it('requires a name', () => {
    assert.equal(parseNewShoppingList({}).ok, false);
  });

  it('keeps an optional work item link and nothing else', () => {
    const result = parseNewShoppingList({ name: 'Materialer', workItemId: 'w1', projectId: 'other' });
    assert.ok(result.ok);
    assert.equal(result.value.workItemId, 'w1');
    assert.equal('projectId' in result.value, false, 'the project comes from the route, not the body');
  });
});
