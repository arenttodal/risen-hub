import { eq, inArray } from 'drizzle-orm';
import { getDb, tryGetDb } from '@/db';
import { shoppingItems, shoppingLists } from '@/db/schema';
import { calculateTotals, sumTotals, type PricedItem, type ShoppingTotals } from '../money';
import { recordActivity } from './activity';

/**
 * Shopping lists and their cost totals.
 *
 * Totals are always computed here, on the server, from the stored integer øre.
 * A client-supplied total is never trusted or persisted: the numbers feed a
 * budget, and the only defensible source is the rows themselves.
 */

export interface ShoppingListWithTotals {
  id: string;
  projectId: string;
  workItemId: string | null;
  name: string;
  status: string;
  totals: ShoppingTotals;
}

const toPriced = (row: typeof shoppingItems.$inferSelect): PricedItem => ({
  quantityMilli: row.quantityMilli,
  estimatedUnitPriceOre: row.estimatedUnitPriceOre,
  actualUnitPriceOre: row.actualUnitPriceOre,
  status: row.status as PricedItem['status'],
  budgetLineId: row.budgetLineId,
});

export async function listShoppingLists(projectId?: string): Promise<ShoppingListWithTotals[]> {
  const db = tryGetDb();
  if (!db) return [];

  const lists = projectId
    ? await db.select().from(shoppingLists).where(eq(shoppingLists.projectId, projectId))
    : await db.select().from(shoppingLists);
  if (lists.length === 0) return [];

  const items = await db
    .select()
    .from(shoppingItems)
    .where(inArray(shoppingItems.shoppingListId, lists.map(list => list.id)));

  return lists.map(list => ({
    id: list.id,
    projectId: list.projectId,
    workItemId: list.workItemId,
    name: list.name,
    status: list.status,
    totals: calculateTotals(items.filter(item => item.shoppingListId === list.id).map(toPriced)),
  }));
}

export async function listShoppingItems(listId: string) {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db.select().from(shoppingItems).where(eq(shoppingItems.shoppingListId, listId));
  return rows.sort((a, b) => a.position - b.position);
}

/**
 * One project's purchasing picture, across all its lists.
 *
 * `budgetedOre` and `unbudgetedOre` split the same forecast rather than adding
 * to it, so a cost already represented in a budget line is never counted twice.
 */
export async function projectShoppingTotals(projectId: string): Promise<ShoppingTotals> {
  const lists = await listShoppingLists(projectId);
  return sumTotals(lists.map(list => list.totals));
}

export async function createShoppingList(input: {
  projectId: string;
  workItemId?: string | null;
  name: string;
}): Promise<{ id: string }> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.insert(shoppingLists).values({
    id,
    projectId: input.projectId,
    workItemId: input.workItemId ?? null,
    name: input.name,
    status: 'open',
    createdBy: null,
    createdAt: now,
    updatedAt: now,
  });
  await recordActivity({
    entityType: 'project',
    entityId: input.projectId,
    action: 'created',
    summary: `Innkjøpsliste opprettet: ${input.name}`,
    metadata: { shoppingListId: id },
  });
  return { id };
}

export interface NewShoppingItem {
  name: string;
  quantityMilli: number;
  unit: string;
  estimatedUnitPriceOre: number | null;
  actualUnitPriceOre: number | null;
  supplier: string | null;
  productUrl: string | null;
  budgetLineId: string | null;
  status: PricedItem['status'];
}

export async function createShoppingItem(listId: string, input: NewShoppingItem): Promise<{ id: string }> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const existing = await db.select().from(shoppingItems).where(eq(shoppingItems.shoppingListId, listId));

  await db.insert(shoppingItems).values({
    id,
    shoppingListId: listId,
    budgetLineId: input.budgetLineId,
    name: input.name,
    description: null,
    category: null,
    quantityMilli: input.quantityMilli,
    unit: input.unit,
    estimatedUnitPriceOre: input.estimatedUnitPriceOre,
    actualUnitPriceOre: input.actualUnitPriceOre,
    supplier: input.supplier,
    productUrl: input.productUrl,
    status: input.status,
    purchasedAt: input.status === 'purchased' ? now : null,
    purchasedBy: null,
    position: existing.length,
    createdAt: now,
    updatedAt: now,
  });

  await recordActivity({
    entityType: 'work_item',
    entityId: listId,
    action: 'created',
    summary: `Produkt lagt til: ${input.name}`,
    metadata: { shoppingItemId: id, quantityMilli: input.quantityMilli },
  });
  return { id };
}
