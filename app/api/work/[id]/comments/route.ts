import { forbidden, invalid, isSameOrigin, readJson, serverError } from '@/lib/risen/api';
import { parseComment } from '@/lib/risen/validate';
import { createComment, listComments } from '@/lib/risen/services/comments';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return Response.json({ comments: await listComments(id) });
  } catch (error) {
    return serverError('listComments', error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await params;
  const parsed = parseComment(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);
  try {
    const created = await createComment(id, parsed.value);
    return Response.json(created, { status: 201 });
  } catch (error) {
    return serverError('createComment', error);
  }
}
