import { forbidden, invalid, isSameOrigin, notFound, readJson, serverError } from '@/lib/risen/api';
import { parseShoppingItemPatch } from '@/lib/risen/validate';
import { cancelShoppingItem, updateShoppingItem } from '@/lib/risen/services/shopping';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await params;
  const parsed = parseShoppingItemPatch(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);
  try {
    const updated = await updateShoppingItem(id, parsed.value);
    return updated ? Response.json({ ok: true }) : notFound();
  } catch (error) {
    return serverError('updateShoppingItem', error);
  }
}

/**
 * Cancels the line rather than removing the row, so the decision not to buy
 * something stays on the record. Cancelled lines are excluded from every total.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await params;
  try {
    const cancelled = await cancelShoppingItem(id);
    return cancelled ? Response.json({ ok: true, status: 'cancelled' }) : notFound();
  } catch (error) {
    return serverError('cancelShoppingItem', error);
  }
}
