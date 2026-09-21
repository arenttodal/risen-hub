import { forbidden, invalid, isSameOrigin, notFound, readJson, serverError } from '@/lib/risen/api';
import { parseWorkItemPatch } from '@/lib/risen/validate';
import { listSubtasks, updateWorkItem } from '@/lib/risen/services/work';
import { listComments } from '@/lib/risen/services/comments';
import { listActivityFor } from '@/lib/risen/services/activity';
import { getWorkItem } from '@/lib/risen/repository';

/** Everything the detail panel needs, in one round trip. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const item = await getWorkItem(id);
    if (!item) return notFound();
    const [subtasks, comments, activity] = await Promise.all([
      listSubtasks(id),
      listComments(id),
      listActivityFor('work_item', id),
    ]);
    return Response.json({ item, subtasks, comments, activity });
  } catch (error) {
    return serverError('getWorkItem', error);
  }
}

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
