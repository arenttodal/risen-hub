import { forbidden, invalid, isSameOrigin, readJson, serverError } from '@/lib/risen/api';
import { parseShoppingItem } from '@/lib/risen/validate';
import { createShoppingItem, listShoppingItems } from '@/lib/risen/services/shopping';

export async function GET(_request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  try {
    return Response.json({ items: await listShoppingItems(listId) });
  } catch (error) {
    return serverError('listShoppingItems', error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { listId } = await params;
  const parsed = parseShoppingItem(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);
  try {
    const created = await createShoppingItem(listId, parsed.value);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return serverError('createShoppingItem', error);
  }
}
