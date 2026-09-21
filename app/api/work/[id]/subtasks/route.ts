import { forbidden, invalid, isSameOrigin, notFound, readJson, serverError } from '@/lib/risen/api';
import { parseNewWorkItem } from '@/lib/risen/validate';
import { createSubtask } from '@/lib/risen/services/work';

/**
 * Subtasks are canonical work items with a parent, so this shares the same
 * validation as a top-level task. The service rejects a link that would close
 * a cycle before it writes one.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await params;
  const parsed = parseNewWorkItem(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);

  try {
    const result = await createSubtask(id, parsed.value);
    if (result.ok) return Response.json({ id: result.id }, { status: 201 });
    if (result.reason === 'parent_not_found') return notFound();
    return Response.json({ errors: ['Dette ville laget en sirkel i oppgavetreet.'] }, { status: 409 });
  } catch (error) {
    return serverError('createSubtask', error);
  }
}
