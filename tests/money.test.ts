import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateTotals,
  formatOre,
  formatOreExact,
  formatQuantity,
  lineTotalOre,
  parseKronerToOre,
  parseQuantity,
  sumTotals,
  type PricedItem,
} from '../lib/risen/money.ts';

const item = (over: Partial<PricedItem> = {}): PricedItem => ({
  quantityMilli: 1000,
  estimatedUnitPriceOre: null,
  actualUnitPriceOre: null,
  status: 'planned',
  ...over,
});

describe('lineTotalOre', () => {
  it('multiplies quantity by unit price', () => {
    // 8 sacks x 289,00 = 2312,00
    assert.equal(lineTotalOre(8000, 28900), 231200);
  });

  it('handles a decimal quantity without floating point drift', () => {
    // 2,5 x 289,90 = 724,75 exactly, which 0.1+0.2 arithmetic would not give.
    assert.equal(lineTotalOre(2500, 28990), 72475);
  });

  it('survives the classic float case', () => {
    // 0,1 + 0,2 !== 0,3 in binary float; in øre it is exact.
    assert.equal(lineTotalOre(3000, 10) + lineTotalOre(3000, 20), lineTotalOre(3000, 30));
  });

  it('treats a missing price as zero rather than NaN', () => {
    assert.equal(lineTotalOre(8000, null), 0);
  });

  it('rounds once, to the nearest øre', () => {
    // 3 x 33,333... -> 100,00
    assert.equal(lineTotalOre(3000, 3333), 9999);
    assert.equal(lineTotalOre(1500, 3333), 5000); // 4999.5 rounds up
  });
});

describe('calculateTotals', () => {
  it('computes the worked example from the spec', () => {
    const totals = calculateTotals([
      item({ quantityMilli: 8000, estimatedUnitPriceOre: 28900 }),
      item({ quantityMilli: 4000, estimatedUnitPriceOre: 12900 }),
      item({ quantityMilli: 2000, estimatedUnitPriceOre: 34900, actualUnitPriceOre: 34900, status: 'purchased' }),
    ]);
    assert.equal(totals.estimatedOre, 231200 + 51600 + 69800);
    assert.equal(totals.purchasedOre, 69800);
    assert.equal(totals.remainingOre, 231200 + 51600);
    assert.equal(totals.forecastOre, totals.purchasedOre + totals.remainingOre);
    assert.equal(totals.purchasedCount, 1);
    assert.equal(totals.itemCount, 3);
  });

  it('excludes cancelled lines from every figure', () => {
    const totals = calculateTotals([
      item({ quantityMilli: 1000, estimatedUnitPriceOre: 10000 }),
      item({ quantityMilli: 1000, estimatedUnitPriceOre: 99900, status: 'cancelled' }),
    ]);
    assert.equal(totals.estimatedOre, 10000);
    assert.equal(totals.forecastOre, 10000);
    assert.equal(totals.itemCount, 1);
  });

  it('prefers a recorded actual price over the estimate in the forecast', () => {
    const totals = calculateTotals([
      item({ quantityMilli: 1000, estimatedUnitPriceOre: 10000, actualUnitPriceOre: 12500 }),
    ]);
    // The estimate is reported unchanged, but the forecast uses the better number.
    assert.equal(totals.estimatedOre, 10000);
    assert.equal(totals.forecastOre, 12500);
    assert.equal(totals.remainingOre, 12500);
  });

  it('counts a purchased line as spent, not as remaining', () => {
    const totals = calculateTotals([
      item({ quantityMilli: 2000, actualUnitPriceOre: 5000, status: 'purchased' }),
    ]);
    assert.equal(totals.purchasedOre, 10000);
    assert.equal(totals.remainingOre, 0);
  });

  it('falls back to the estimate when a purchase recorded no actual price', () => {
    const totals = calculateTotals([
      item({ quantityMilli: 1000, estimatedUnitPriceOre: 7500, status: 'purchased' }),
    ]);
    assert.equal(totals.purchasedOre, 7500);
  });

  it('handles a line with no price at all', () => {
    const totals = calculateTotals([item({ quantityMilli: 5000 })]);
    assert.equal(totals.forecastOre, 0);
    assert.equal(totals.itemCount, 1);
  });

  it('splits budgeted from unbudgeted so nothing is double counted', () => {
    const totals = calculateTotals([
      item({ quantityMilli: 1000, estimatedUnitPriceOre: 2400000, budgetLineId: 'bl-1' }),
      item({ quantityMilli: 1000, estimatedUnitPriceOre: 440000 }),
    ]);
    assert.equal(totals.budgetedOre, 2400000);
    assert.equal(totals.unbudgetedOre, 440000);
    // The two halves reconstruct the forecast exactly, so neither is added twice.
    assert.equal(totals.budgetedOre + totals.unbudgetedOre, totals.forecastOre);
  });

  it('returns zeroes for an empty list', () => {
    const totals = calculateTotals([]);
    assert.equal(totals.forecastOre, 0);
    assert.equal(totals.itemCount, 0);
  });
});

describe('sumTotals', () => {
  it('adds several lists into a project total', () => {
    const a = calculateTotals([item({ quantityMilli: 1000, estimatedUnitPriceOre: 10000 })]);
    const b = calculateTotals([item({ quantityMilli: 2000, estimatedUnitPriceOre: 20000, status: 'purchased' })]);
    const total = sumTotals([a, b]);
    assert.equal(total.forecastOre, 10000 + 40000);
    assert.equal(total.purchasedOre, 40000);
    assert.equal(total.itemCount, 2);
  });

  it('does not count the same list twice when summed once', () => {
    const one = calculateTotals([item({ quantityMilli: 1000, estimatedUnitPriceOre: 50000 })]);
    assert.equal(sumTotals([one]).forecastOre, one.forecastOre);
  });
});

describe('parsing and formatting', () => {
  it('parses Norwegian decimal commas', () => {
    assert.equal(parseQuantity('2,5'), 2500);
    assert.equal(parseQuantity('8'), 8000);
    assert.equal(parseKronerToOre('289,90'), 28990);
    assert.equal(parseKronerToOre('1 299'), 129900);
  });

  it('rejects input that is not a usable number', () => {
    for (const bad of ['', 'abc', '-5', '2,5555', null, undefined]) {
      assert.equal(parseQuantity(bad as string), null, `quantity ${bad}`);
    }
    assert.equal(parseKronerToOre('12,345'), null);
  });

  it('formats for display', () => {
    assert.equal(formatQuantity(8000), '8');
    assert.equal(formatQuantity(2500), '2,5');
    assert.match(formatOre(352600), /3\s?526 kr/);
  });
});

describe('formatOreExact', () => {
  it('keeps the øre a unit price was entered with', () => {
    assert.equal(formatOreExact(28990), '289,90 kr');
  });

  it('falls back to whole kroner when there are no øre', () => {
    assert.equal(formatOreExact(29000), '290 kr');
  });

  it('does not hide øre behind a thousands separator', () => {
    assert.equal(formatOreExact(1250050).replace(/ /g, ' '), '12 500,50 kr');
  });

  it('matches formatOre whenever the amount is whole kroner', () => {
    for (const ore of [0, 100, 500000]) assert.equal(formatOreExact(ore), formatOre(ore));
  });
});
