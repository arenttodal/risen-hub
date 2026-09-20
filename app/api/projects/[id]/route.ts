import { forbidden, invalid, isSameOrigin, notFound, readJson, serverError } from '@/lib/risen/api';
import { parseProjectPatch } from '@/lib/risen/validate';
import { updateProject } from '@/lib/risen/services/projects';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();

  const { id } = await params;
  const parsed = parseProjectPatch(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);

  try {
    const updated = await updateProject(id, parsed.value);
    return updated ? Response.json({ ok: true }) : notFound();
  } catch (error) {
    return serverError('updateProject', error);
  }
}
