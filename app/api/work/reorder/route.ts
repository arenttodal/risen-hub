import { forbidden, invalid, isSameOrigin, readJson, serverError } from '@/lib/risen/api';
import { parseWorkMoves } from '@/lib/risen/validate';
import { applyWorkMoves } from '@/lib/risen/services/work';

/**
 * A board move, as one request.
 *
 * Dragging a card renumbers its neighbours too, so sending one PATCH per
 * affected row would leave the board readable only after the last of them
 * landed. The whole batch is validated before anything is written.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const parsed = parseWorkMoves(await readJson(request));
  if (!parsed.ok) return invalid(parsed.errors);
  try {
    return Response.json(await applyWorkMoves(parsed.value));
  } catch (error) {
    return serverError('applyWorkMoves', error);
  }
}
