import { forbidden, invalid, isSameOrigin, readJson, serverError } from '@/lib/risen/api';
import { parseNewShoppingList } from '@/lib/risen/validate';
import { createShoppingList, listShoppingLists } from '@/lib/risen/services/shopping';

/** Lists with their totals. Totals are always computed server-side. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return Response.json({ lists: await listShoppingLists(id) });
  } catch (error) {
    return serverError('listShoppingLists', error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await params;
  const parsed = parseNewShoppingList(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);
  try {
    const created = await createShoppingList({ projectId: id, ...parsed.value });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return serverError('createShoppingList', error);
  }
}
