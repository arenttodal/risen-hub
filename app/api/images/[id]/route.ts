import { forbidden, invalid, isSameOrigin, notFound, readJson, serverError } from '@/lib/risen/api';
import { IMAGE_KINDS, type ImageKind } from '@/lib/risen/images';
import { deleteImage, setFeatured, updateImage } from '@/lib/risen/services/images';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await params;
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return invalid(['Forventet et JSON-objekt.']);

  try {
    if (body.featured === true) {
      return (await setFeatured(id)) ? Response.json({ ok: true }) : notFound();
    }

    const patch: { kind?: ImageKind; caption?: string | null } = {};
    if ('kind' in body) {
      const kind = String(body.kind);
      if (!(IMAGE_KINDS as string[]).includes(kind)) return invalid(['Ukjent bildetype.']);
      patch.kind = kind as ImageKind;
    }
    if ('caption' in body) {
      const caption = body.caption === null ? null : String(body.caption);
      if (caption !== null && caption.length > 300) return invalid(['Bildeteksten er for lang.']);
      patch.caption = caption;
    }
    if (Object.keys(patch).length === 0) return invalid(['Ingen felter å oppdatere.']);

    return (await updateImage(id, patch)) ? Response.json({ ok: true }) : notFound();
  } catch (error) {
    return serverError('updateImage', error);
  }
}

/** Genuinely removes the image. The interface confirms before calling this. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await params;
  try {
    return (await deleteImage(id)) ? Response.json({ ok: true }) : notFound();
  } catch (error) {
    return serverError('deleteImage', error);
  }
}
