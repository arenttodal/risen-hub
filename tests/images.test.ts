import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ACCEPTED_TYPES,
  MAX_BYTES,
  checkUpload,
  formatBytes,
  pickFeatured,
  storageKeyFor,
  type FeaturedCandidate,
} from '../lib/risen/images.ts';

const file = (over: Partial<{ name: string; type: string; size: number }> = {}) => ({
  name: 'IMG_4021.jpg',
  type: 'image/jpeg',
  size: 2_400_000,
  ...over,
});

describe('checkUpload', () => {
  it('accepts every format a browser can actually render', () => {
    for (const type of ACCEPTED_TYPES) {
      assert.equal(checkUpload(file({ type })).ok, true, type);
    }
  });

  it('refuses HEIC and says why, because Safari offers it and nothing else shows it', () => {
    const result = checkUpload(file({ name: 'IMG_4021.HEIC', type: 'image/heic' }));
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.reason : '', /iPhone|JPEG/);
  });

  it('refuses a PDF politely rather than storing a picture nobody can see', () => {
    const result = checkUpload(file({ name: 'tegning.pdf', type: 'application/pdf' }));
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.reason : '', /tegning\.pdf/);
  });

  it('names the file and both sizes when it is too large', () => {
    const result = checkUpload(file({ size: MAX_BYTES + 1 }));
    assert.equal(result.ok, false);
    const reason = result.ok === false ? result.reason : '';
    assert.match(reason, /IMG_4021\.jpg/);
    assert.match(reason, /12,0 MB/);
  });

  it('accepts a file exactly at the limit', () => {
    assert.equal(checkUpload(file({ size: MAX_BYTES })).ok, true);
  });

  it('refuses an empty file', () => {
    assert.equal(checkUpload(file({ size: 0 })).ok, false);
  });

  it('refuses a file with no name and no type at all', () => {
    assert.equal(checkUpload(file({ name: '', type: '' })).ok, false);
  });
});

describe('storageKeyFor', () => {
  it('namespaces by project so a bucket listing is readable', () => {
    assert.equal(storageKeyFor('barn', 'IMG_4021.jpg', 'abc'), 'projects/barn/abc.jpg');
  });

  it('keys on the id, not the name, so two identical filenames cannot collide', () => {
    const a = storageKeyFor('barn', 'IMG_4021.jpg', 'one');
    const b = storageKeyFor('barn', 'IMG_4021.jpg', 'two');
    assert.notEqual(a, b);
  });

  it('lowercases and strips the extension rather than trusting it', () => {
    assert.equal(storageKeyFor('barn', 'photo.JPEG', 'x'), 'projects/barn/x.jpeg');
    assert.equal(storageKeyFor('barn', 'evil.../..jp g', 'x'), 'projects/barn/x.jpg');
  });

  it('copes with a file that has no extension', () => {
    assert.equal(storageKeyFor('barn', 'scan', 'x'), 'projects/barn/x.bin');
  });
});

const image = (over: Partial<FeaturedCandidate> = {}): FeaturedCandidate => ({
  id: 'i1',
  kind: 'current',
  isFeatured: false,
  position: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

describe('pickFeatured', () => {
  it('has nothing to show when there are no images', () => {
    assert.equal(pickFeatured([]), null);
  });

  it('prefers a mockup, because the card shows what the place is becoming', () => {
    const chosen = pickFeatured([
      image({ id: 'photo', kind: 'current', createdAt: '2026-09-10T00:00:00.000Z' }),
      image({ id: 'drawing', kind: 'mockup', createdAt: '2026-09-01T00:00:00.000Z' }),
    ]);
    assert.equal(chosen?.id, 'drawing', 'even though the photo is newer');
  });

  it('falls back to a photo so a project that has not been drawn yet still has a picture', () => {
    const chosen = pickFeatured([image({ id: 'photo', kind: 'current' })]);
    assert.equal(chosen?.id, 'photo');
  });

  it('lets an explicit choice beat both rules', () => {
    const chosen = pickFeatured([
      image({ id: 'drawing', kind: 'mockup', createdAt: '2026-09-10T00:00:00.000Z' }),
      image({ id: 'picked', kind: 'current', isFeatured: true }),
    ]);
    assert.equal(chosen?.id, 'picked');
  });

  it('takes the newest of several mockups', () => {
    const chosen = pickFeatured([
      image({ id: 'old', kind: 'mockup', createdAt: '2026-01-01T00:00:00.000Z' }),
      image({ id: 'new', kind: 'mockup', createdAt: '2026-09-01T00:00:00.000Z' }),
    ]);
    assert.equal(chosen?.id, 'new');
  });

  it('breaks a tie on position rather than returning something arbitrary', () => {
    const same = '2026-09-01T00:00:00.000Z';
    const chosen = pickFeatured([
      image({ id: 'second', kind: 'mockup', createdAt: same, position: 1 }),
      image({ id: 'first', kind: 'mockup', createdAt: same, position: 0 }),
    ]);
    assert.equal(chosen?.id, 'first');
  });
});

describe('formatBytes', () => {
  it('reads the way a person would say it', () => {
    assert.equal(formatBytes(900), '900 B');
    assert.equal(formatBytes(2048), '2 kB');
    assert.equal(formatBytes(2_400_000), '2,3 MB');
  });
});
