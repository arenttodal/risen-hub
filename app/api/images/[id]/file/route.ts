import { readImage } from '@/lib/risen/services/images';

/**
 * Serves the bytes.
 *
 * Images go through this route rather than a public bucket URL so that
 * `visibility` can decide who sees what once authentication exists. A bucket
 * URL, once shared, is public forever and cannot be taken back.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const image = await readImage(id);
    if (!image) return new Response('Not found', { status: 404 });
    return new Response(image.body, {
      headers: {
        'Content-Type': image.contentType,
        // The id is unique per upload and the bytes never change, so this is
        // safe to cache hard. A replaced image is a new row with a new id.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
