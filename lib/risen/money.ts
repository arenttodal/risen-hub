/**
 * Money and quantity arithmetic for shopping lists.
 *
 * Two rules make the rest of this file make sense:
 *
 * 1. Money is whole øre in integers. 289.90 kr has no exact binary float
 *    representation, so a budget summed in floats drifts. Nothing here is ever
 *    a float.
 * 2. Quantity is scaled by 1000. 8 sacks is 8000, 2.5 metres is 2500. That
 *    keeps three decimals of precision without floats either.
 *
 * A line total is therefore (quantityMilli × unitPriceOre) / 1000, rounded to
 * the nearest øre once, at the end.
 */

export type ShoppingItemStatus = 'planned' | 'needs_decision' | 'ready' | 'purchased' | 'cancelled';

export interface PricedItem {
  quantityMilli: number;
  estimatedUnitPriceOre: number | null;
  actualUnitPriceOre: number | null;
  status: ShoppingItemStatus;
  /** Set when the cost is already represented in a budget line. */
  budgetLineId?: string | null;
}

export const QUANTITY_SCALE = 1000;

/** Quantity × unit price, in whole øre. Rounded once, at the end. */
export function lineTotalOre(quantityMilli: number, unitPriceOre: number | null): number {
  if (unitPriceOre === null || !Number.isFinite(unitPriceOre)) return 0;
  if (!Number.isFinite(quantityMilli)) return 0;
  return Math.round((quantityMilli * unitPriceOre) / QUANTITY_SCALE);
}

/**
 * What this line is expected to cost.
 *
 * A recorded actual price is the better forecast even before the item is
 * bought — someone has checked it — so it wins over the estimate. That is a
 * deliberate choice, and the tests pin it down.
 */
export function forecastUnitPriceOre(item: PricedItem): number | null {
  return item.actualUnitPriceOre ?? item.estimatedUnitPriceOre;
}

export interface ShoppingTotals {
  /** sum(estimated price × quantity), excluding cancelled. */
  estimatedOre: number;
  /** sum(actual price × quantity) for purchased items only. */
  purchasedOre: number;
  /** sum(forecast price × quantity) for everything not yet purchased. */
  remainingOre: number;
  /** purchased + remaining. What the whole list is expected to cost. */
  forecastOre: number;
  /** Forecast for lines already covered by a budget line, so they are not counted twice. */
  budgetedOre: number;
  /** Forecast for lines with no budget line behind them. */
  unbudgetedOre: number;
  itemCount: number;
  purchasedCount: number;
}

const EMPTY: ShoppingTotals = {
  estimatedOre: 0,
  purchasedOre: 0,
  remainingOre: 0,
  forecastOre: 0,
  budgetedOre: 0,
  unbudgetedOre: 0,
  itemCount: 0,
  purchasedCount: 0,
};

/**
 * Totals for a set of lines. Cancelled lines are excluded from every figure —
 * a cancelled purchase is not a cost, forecast or otherwise.
 */
export function calculateTotals(items: PricedItem[]): ShoppingTotals {
  return items.reduce<ShoppingTotals>((totals, item) => {
    if (item.status === 'cancelled') return totals;

    const estimated = lineTotalOre(item.quantityMilli, item.estimatedUnitPriceOre);
    const forecast = lineTotalOre(item.quantityMilli, forecastUnitPriceOre(item));
    const purchased = item.status === 'purchased' ? forecast : 0;
    const remaining = item.status === 'purchased' ? 0 : forecast;

    return {
      estimatedOre: totals.estimatedOre + estimated,
      purchasedOre: totals.purchasedOre + purchased,
      remainingOre: totals.remainingOre + remaining,
      forecastOre: totals.forecastOre + forecast,
      budgetedOre: totals.budgetedOre + (item.budgetLineId ? forecast : 0),
      unbudgetedOre: totals.unbudgetedOre + (item.budgetLineId ? 0 : forecast),
      itemCount: totals.itemCount + 1,
      purchasedCount: totals.purchasedCount + (item.status === 'purchased' ? 1 : 0),
    };
  }, EMPTY);
}

/** Adds several lists' totals without recomputing from their lines. */
export function sumTotals(all: ShoppingTotals[]): ShoppingTotals {
  return all.reduce<ShoppingTotals>(
    (sum, totals) => ({
      estimatedOre: sum.estimatedOre + totals.estimatedOre,
      purchasedOre: sum.purchasedOre + totals.purchasedOre,
      remainingOre: sum.remainingOre + totals.remainingOre,
      forecastOre: sum.forecastOre + totals.forecastOre,
      budgetedOre: sum.budgetedOre + totals.budgetedOre,
      unbudgetedOre: sum.unbudgetedOre + totals.unbudgetedOre,
      itemCount: sum.itemCount + totals.itemCount,
      purchasedCount: sum.purchasedCount + totals.purchasedCount,
    }),
    EMPTY,
  );
}

const KRONER = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Øre to a display string. Rounds to whole kroner, which is how the farm talks. */
export function formatOre(ore: number): string {
  return `${KRONER.format(Math.round(ore / 100))} kr`;
}

/** Quantity for display: 8000 -> "8", 2500 -> "2,5". */
export function formatQuantity(quantityMilli: number): string {
  const whole = quantityMilli / QUANTITY_SCALE;
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 3 }).format(whole);
}

/** Parses "2,5" or "2.5" into scaled milli-units. Null when not a usable number. */
export function parseQuantity(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  const normalised = typeof input === 'number' ? String(input) : input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * QUANTITY_SCALE);
}

/** Parses "289,90" into øre. Null when not a usable amount. */
export function parseKronerToOre(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  const normalised = typeof input === 'number' ? String(input) : input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * 100);
}
