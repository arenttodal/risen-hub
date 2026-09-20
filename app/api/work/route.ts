import { forbidden, invalid, isSameOrigin, readJson, serverError } from '@/lib/risen/api';
import { parseNewWorkItem } from '@/lib/risen/validate';
import { createWorkItem } from '@/lib/risen/services/work';

/** Quick capture. Only a title is required; everything else has a safe default. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();

  const parsed = parseNewWorkItem(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);

  try {
    const { id } = await createWorkItem(parsed.value);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return serverError('createWorkItem', error);
  }
}
