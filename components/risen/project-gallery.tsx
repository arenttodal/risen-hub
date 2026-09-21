'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Star, Trash2, Upload, X } from 'lucide-react';
import {
  ACCEPTED_TYPES,
  checkUpload,
  formatBytes,
  kindDescriptions,
  kindLabels,
  pickFeatured,
  type ImageKind,
} from '@/lib/risen/images';

/**
 * The project's pictures.
 *
 * A single card in the project header shows the one image that represents the
 * project — a mockup where there is one, its newest photo otherwise, so a
 * renovation nobody has drawn yet is still shown rather than reduced to an
 * empty grey box. Everything else lives in an overlay behind one click, which
 * is what keeps the project page from filling up with thumbnails.
 */

interface GalleryImage {
  id: string;
  kind: ImageKind;
  fileName: string;
  sizeBytes: number;
  caption: string | null;
  isFeatured: boolean;
  position: number;
  createdAt: string;
  url: string;
}

export function ProjectGallery({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [storage, setStorage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/images`);
      const body = (await response.json()) as { images: GalleryImage[]; storage: boolean };
      setImages(body.images);
      setStorage(body.storage);
    } catch {
      setStorage(false);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * With no bucket bound, the rows are metadata pointing at bytes nobody can
   * fetch. Drawing them would fill the page with broken-image glyphs, so the
   * card shows its empty state and the overlay explains where the files went.
   */
  const featured = storage ? pickFeatured(images) : null;

  return (
    <>
      <button
        type="button"
        className={`gallery-card${featured ? ' has-image' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {featured ? (
          <>
            <img src={featured.url} alt={featured.caption ?? featured.fileName} />
            <span className="gallery-card-foot">
              <span className="kicker">{kindLabels[featured.kind]}</span>
              <span className="tnum">{images.length}</span>
            </span>
          </>
        ) : (
          <span className="gallery-card-empty">
            <ImageIcon size={20} />
            <strong>
              {loading ? 'Laster bilder…' : images.length > 0 ? 'Bildene er utilgjengelige' : 'Ingen bilder ennå'}
            </strong>
            <small>
              {storage === false
                ? images.length > 0
                  ? `${images.length} bilder er registrert, men lagringen er frakoblet`
                  : 'Bildelagring er ikke koblet til'
                : 'Legg til skisser og bilder av dagens tilstand'}
            </small>
          </span>
        )}
      </button>

      {open && (
        <GalleryOverlay
          projectId={projectId}
          projectName={projectName}
          images={images}
          storage={storage ?? false}
          onClose={() => setOpen(false)}
          onChanged={async () => {
            await load();
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function GalleryOverlay({
  projectId,
  projectName,
  images,
  storage,
  onClose,
  onChanged,
}: {
  projectId: string;
  projectName: string;
  images: GalleryImage[];
  storage: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<Element | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<ImageKind | null>(null);
  const [dragKind, setDragKind] = useState<ImageKind | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    restoreFocus.current = document.activeElement;
    panel.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      (restoreFocus.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    // Keeps Tab inside the overlay: a dialog you can tab out of leaves the
    // keyboard somewhere the mouse cannot see.
    const focusable = panel.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  async function upload(kind: ImageKind, files: File[]) {
    if (files.length === 0) return;
    setErrors([]);

    // Checked here as well as on the server, so an obviously wrong file is
    // refused instantly instead of after a megabyte has gone over the wire.
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      const check = checkUpload({ name: file.name, type: file.type, size: file.size });
      if (check.ok) accepted.push(file);
      else rejected.push(check.reason);
    }
    if (accepted.length === 0) {
      setErrors(rejected);
      return;
    }

    setBusy(kind);
    try {
      const form = new FormData();
      form.set('kind', kind);
      for (const file of accepted) form.append('files', file);
      const response = await fetch(`/api/projects/${projectId}/images`, { method: 'POST', body: form });
      const body = (await response.json()) as { errors?: string[] };
      setErrors([...rejected, ...(body.errors ?? [])]);
      await onChanged();
    } catch {
      setErrors([...rejected, 'Opplastingen feilet. Ingen bilder ble lagret.']);
    } finally {
      setBusy(null);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/images/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await onChanged();
  }

  async function remove(id: string) {
    await fetch(`/api/images/${id}`, { method: 'DELETE' });
    setConfirming(null);
    await onChanged();
  }

  const sections: ImageKind[] = ['mockup', 'current'];

  return (
    <div className="gallery-layer">
      <button className="gallery-scrim" aria-label="Lukk bildegalleriet" onClick={onClose} />
      <div
        className="gallery-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Bilder for ${projectName}`}
        tabIndex={-1}
        ref={panel}
        onKeyDown={onKeyDown}
      >
        <header className="gallery-bar">
          <div>
            <span className="kicker">Bilder</span>
            <h2>{projectName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Lukk">
            <X size={18} />
          </button>
        </header>

        {!storage && (
          <p className="gallery-notice" role="status">
            <strong>Bildelagring er ikke koblet til ennå.</strong> Alt annet her er klart — det
            mangler bare en R2-bøtte. Se <code>docs/MEDIA-SETUP.md</code>. Opplasting er slått av
            inntil den finnes.{' '}
            {images.length > 0 && (
              <>
                De {images.length} bildene under er fortsatt registrert; det er bare filene som
                ikke kan hentes. De kommer tilbake når bøtta er på plass.
              </>
            )}
          </p>
        )}

        {errors.length > 0 && (
          <ul className="gallery-errors" role="alert">
            {errors.map(message => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        <div className="gallery-sections">
          {sections.map(kind => {
            const rows = images.filter(image => image.kind === kind);
            return (
              <section
                key={kind}
                className={`gallery-section${dragKind === kind ? ' is-target' : ''}`}
                onDragOver={event => {
                  if (!storage) return;
                  event.preventDefault();
                  setDragKind(kind);
                }}
                onDragLeave={() => setDragKind(null)}
                onDrop={event => {
                  event.preventDefault();
                  setDragKind(null);
                  if (!storage) return;
                  void upload(kind, Array.from(event.dataTransfer.files));
                }}
              >
                <header>
                  <div>
                    <h3>{kindLabels[kind]}</h3>
                    <p>{kindDescriptions[kind]}</p>
                  </div>
                  <label className={`gallery-add${storage ? '' : ' is-disabled'}`}>
                    <Upload size={14} />
                    {busy === kind ? 'Laster opp…' : 'Velg filer'}
                    <input
                      type="file"
                      multiple
                      accept={ACCEPTED_TYPES.join(',')}
                      disabled={!storage || busy !== null}
                      onChange={event => {
                        void upload(kind, Array.from(event.target.files ?? []));
                        event.target.value = '';
                      }}
                    />
                  </label>
                </header>

                {rows.length === 0 ? (
                  <p className="gallery-drop">
                    {storage
                      ? 'Dra bilder hit, eller velg filer.'
                      : 'Ingen bilder. Opplasting krever bildelagring.'}
                  </p>
                ) : (
                  <ul className="gallery-grid">
                    {rows.map(image => (
                      <li key={image.id}>
                        {storage ? (
                          <img
                            src={image.url}
                            alt={image.caption ?? image.fileName}
                            loading="lazy"
                            /* One object can go missing while the bucket is fine.
                               A labelled placeholder says so; the browser's broken
                               -image glyph just looks like the app is broken. */
                            onError={event => {
                              event.currentTarget.classList.add('is-missing');
                            }}
                          />
                        ) : (
                          <span className="gallery-item-missing">Filen kan ikke hentes</span>
                        )}
                        <div className="gallery-item-bar">
                          <span title={image.fileName}>{image.fileName}</span>
                          <small className="tnum">{formatBytes(image.sizeBytes)}</small>
                        </div>
                        <div className="gallery-item-actions">
                          <button
                            type="button"
                            className="row-action"
                            aria-pressed={image.isFeatured}
                            aria-label={
                              image.isFeatured
                                ? `«${image.fileName}» er prosjektets bilde`
                                : `Bruk «${image.fileName}» som prosjektets bilde`
                            }
                            onClick={() => patch(image.id, { featured: true })}
                          >
                            <Star size={13} />
                          </button>
                          <button
                            type="button"
                            className="row-action"
                            aria-label={`Flytt «${image.fileName}» til ${
                              kindLabels[kind === 'mockup' ? 'current' : 'mockup']
                            }`}
                            onClick={() => patch(image.id, { kind: kind === 'mockup' ? 'current' : 'mockup' })}
                          >
                            ⇄
                          </button>
                          {confirming === image.id ? (
                            <span className="gallery-confirm">
                              <button type="button" className="danger" onClick={() => remove(image.id)}>
                                Slett
                              </button>
                              <button type="button" onClick={() => setConfirming(null)}>
                                Avbryt
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="row-action"
                              aria-label={`Slett «${image.fileName}»`}
                              onClick={() => setConfirming(image.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <p className="gallery-foot">
          Bilder av dagens tilstand teller som <strong>Fotodokumentasjon</strong>, som 7 av 16
          støtteordninger ber om.
        </p>
      </div>
    </div>
  );
}
