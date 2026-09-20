import { forbidden, invalid, isSameOrigin, notFound, readJson, serverError } from '@/lib/risen/api';
import { parseWorkItemPatch } from '@/lib/risen/validate';
import { updateWorkItem } from '@/lib/risen/services/work';

/** Partial update. Omitted fields are left alone rather than blanked. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();

  const { id } = await params;
  const parsed = parseWorkItemPatch(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);

  try {
    const updated = await updateWorkItem(id, parsed.value);
    return updated ? Response.json({ ok: true }) : notFound();
  } catch (error) {
    return serverError('updateWorkItem', error);
  }
}
