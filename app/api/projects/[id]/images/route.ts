import { forbidden, isSameOrigin, serverError } from '@/lib/risen/api';
import { IMAGE_KINDS, type ImageKind } from '@/lib/risen/images';
import { listProjectImages, mediaConfigured, uploadProjectImage } from '@/lib/risen/services/images';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return Response.json({ images: await listProjectImages(id), storage: mediaConfigured() });
  } catch (error) {
    return serverError('listProjectImages', error);
  }
}

/**
 * Multipart upload, one or more files in a single request.
 *
 * Each file is reported on individually: a batch where one photo is a HEIC and
 * three are fine should store the three and say which one it could not take,
 * rather than refusing all four.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ errors: ['Forventet en filopplasting.'] }, { status: 400 });
  }

  const rawKind = String(form.get('kind') ?? 'current');
  const kind: ImageKind = (IMAGE_KINDS as string[]).includes(rawKind) ? (rawKind as ImageKind) : 'current';
  const files = form.getAll('files').filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) return Response.json({ errors: ['Ingen filer i forespørselen.'] }, { status: 400 });

  try {
    const uploaded = [];
    const errors: string[] = [];
    let status = 201;
    for (const file of files) {
      const result = await uploadProjectImage({ projectId: id, kind, file });
      if (result.ok) uploaded.push(result.image);
      else {
        errors.push(result.reason);
        // A missing bucket is not a problem with this particular file, and
        // retrying the rest of the batch against it would say so four times.
        if (result.status === 503) {
          status = 503;
          break;
        }
        status = 207;
      }
    }
    if (uploaded.length === 0 && errors.length > 0 && status !== 503) status = 422;
    return Response.json({ images: uploaded, errors }, { status });
  } catch (error) {
    return serverError('uploadProjectImage', error);
  }
}
