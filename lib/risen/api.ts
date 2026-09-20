/**
 * Shared helpers for the mutation routes.
 *
 * There is no authentication yet, so a same-origin check is the only thing
 * standing between these endpoints and a cross-site form post. It is not
 * authorization and must not be mistaken for it: real authorization has to land
 * before any private data is stored (CLAUDE.md rule 5).
 */

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export const forbidden = () =>
  Response.json({ error: 'Forespørselen må komme fra denne nettsiden.' }, { status: 403 });

export const invalid = (errors: string[]) => Response.json({ errors }, { status: 400 });

export const notFound = () => Response.json({ error: 'Fant ikke raden.' }, { status: 404 });

/** D1 errors are logged server-side rather than swallowed into a blank 503. */
export function serverError(context: string, error: unknown) {
  console.error(`[risen] ${context}:`, error);
  return Response.json({ error: 'Kunne ikke lagre. Prøv igjen.' }, { status: 503 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
