/**
 * What may be uploaded, decided in one place.
 *
 * Pure, so the rules can be tested without a bucket, a request or a database.
 * The API route and the client both read them from here, so the browser cannot
 * offer something the server will refuse.
 */

export type ImageKind = 'current' | 'mockup';

export const IMAGE_KINDS: ImageKind[] = ['current', 'mockup'];

export const kindLabels: Record<ImageKind, string> = {
  current: 'Slik er det nå',
  mockup: 'Slik skal det bli',
};

export const kindDescriptions: Record<ImageKind, string> = {
  current: 'Dokumentasjon av dagens tilstand. Dette er det søknader ber om.',
  mockup: 'Skisser og forslag til hvordan det skal bli.',
};

/**
 * Formats a browser will actually render, and that R2 will serve back without
 * conversion. HEIC is deliberately absent: Safari uploads it happily and no
 * other browser can display it, so accepting it would store pictures nobody
 * can see.
 */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const;

/** 12 MB. A phone photo is 3–6 MB; anything far beyond that is a mistake. */
export const MAX_BYTES = 12 * 1024 * 1024;

export interface UploadCandidate {
  name: string;
  type: string;
  size: number;
}

export type UploadCheck = { ok: true } | { ok: false; reason: string };

export function checkUpload(file: UploadCandidate): UploadCheck {
  if (!file.name || file.name.trim() === '') {
    return { ok: false, reason: 'Filen mangler navn.' };
  }
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    const suffix = file.type === 'image/heic' || file.type === 'image/heif'
      ? ' HEIC fra iPhone må eksporteres som JPEG først.'
      : '';
    return { ok: false, reason: `${file.name}: ${file.type || 'ukjent filtype'} kan ikke vises i nettleseren.${suffix}` };
  }
  if (file.size <= 0) {
    return { ok: false, reason: `${file.name} er tom.` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: `${file.name} er ${formatBytes(file.size)}. Grensen er ${formatBytes(MAX_BYTES)}.` };
  }
  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * The object key for an upload.
 *
 * Namespaced by project so a bucket listing is readable, and suffixed with a
 * random id so two people uploading `IMG_4021.jpg` in the same minute do not
 * overwrite each other — which is exactly what a name-based key would do.
 */
export function storageKeyFor(projectId: string, fileName: string, id: string): string {
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : 'bin';
  const safe = extension.replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  return `projects/${projectId}/${id}.${safe}`;
}

export interface FeaturedCandidate {
  id: string;
  kind: ImageKind;
  isFeatured: boolean;
  position: number;
  createdAt: string;
}

/**
 * Which image represents the project.
 *
 * A mockup wins over a photo, because the card is meant to show what the place
 * is becoming. An explicit choice wins over both. A renovation that has not
 * been drawn yet still gets a picture — its newest current-state photo — rather
 * than an empty grey box.
 */
export function pickFeatured<T extends FeaturedCandidate>(images: T[]): T | null {
  if (images.length === 0) return null;
  const chosen = images.find(image => image.isFeatured);
  if (chosen) return chosen;

  const newest = (list: T[]) =>
    list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.position - b.position)[0];

  const mockups = images.filter(image => image.kind === 'mockup');
  return mockups.length > 0 ? newest(mockups) : newest(images);
}
