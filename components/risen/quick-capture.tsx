'use client';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

/**
 * Universal capture (PLATFORM-SPEC.md section 8).
 *
 * Reachable from every hub route, by button or by pressing N. The required set
 * is deliberately one field: a title. Anything the person does not know yet is
 * left blank, and an item with no project lands in the inbox rather than being
 * guessed at.
 */

export interface CaptureOption {
  id: string;
  name: string;
}

const types = [
  { value: 'task', label: 'Oppgave' },
  { value: 'repair', label: 'Reparasjon' },
  { value: 'purchase', label: 'Innkjøp' },
  { value: 'dugnad', label: 'Dugnad' },
];

const priorities = [
  { value: 'urgent', label: 'Haster' },
  { value: 'high', label: 'Høy' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Lav' },
];

export function QuickCapture({
  open,
  onClose,
  projects,
  places,
}: {
  open: boolean;
  onClose: () => void;
  projects: CaptureOption[];
  places: CaptureOption[];
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErrors([]);
      setSaved(null);
      titleRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setErrors([]);
    try {
      const response = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.get('title'),
          detail: data.get('detail'),
          type: data.get('type'),
          priority: data.get('priority'),
          projectId: data.get('projectId') || null,
          placeId: data.get('placeId') || null,
          dueDate: data.get('dueDate') || null,
        }),
      });
      const body = (await response.json()) as { errors?: string[]; error?: string };
      if (!response.ok) {
        setErrors(body.errors ?? [body.error ?? 'Kunne ikke lagre.']);
        return;
      }
      setSaved(String(data.get('title') ?? ''));
      form.reset();
      titleRef.current?.focus();
      // Pull the server-rendered lists again so the new item appears at once.
      router.refresh();
    } catch {
      setErrors(['Kunne ikke lagre. Sjekk nettforbindelsen.']);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="capture-layer">
      <button type="button" className="capture-scrim" aria-label="Lukk" onClick={onClose} />
      <section className="capture-sheet" role="dialog" aria-modal="true" aria-labelledby="capture-title">
        <header>
          <div>
            <span className="kicker">Ny sak</span>
            <h2 id="capture-title">Fang det opp nå</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Lukk">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit}>
          <label htmlFor="capture-input">Hva gjelder det?</label>
          <input
            id="capture-input"
            name="title"
            ref={titleRef}
            required
            maxLength={200}
            placeholder="Reparer kjøkkendør"
            autoComplete="off"
          />

          <div className="capture-grid">
            <div>
              <label htmlFor="capture-type">Type</label>
              <select id="capture-type" name="type" defaultValue="task">
                {types.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="capture-priority">Prioritet</label>
              <select id="capture-priority" name="priority" defaultValue="normal">
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="capture-project">Prosjekt</label>
              <select id="capture-project" name="projectId" defaultValue="">
                <option value="">Vet ikke ennå</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="capture-place">Sted</label>
              <select id="capture-place" name="placeId" defaultValue="">
                <option value="">Ikke satt</option>
                {places.map(place => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <details className="capture-more">
            <summary>Flere detaljer</summary>
            <label htmlFor="capture-detail">Beskrivelse</label>
            <textarea id="capture-detail" name="detail" rows={3} maxLength={2000} />
            <label htmlFor="capture-due">Frist</label>
            <input id="capture-due" name="dueDate" type="date" />
          </details>

          {errors.length > 0 && (
            <ul className="capture-errors" role="alert">
              {errors.map(error => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <footer>
            <p className="capture-hint" role="status">
              {saved
                ? `Lagret: ${saved}. Uten prosjekt havner saken i Innboks.`
                : 'Bare tittel er påkrevd. Resten kan fylles ut senere.'}
            </p>
            <button type="submit" disabled={busy}>
              {busy ? 'Lagrer…' : 'Lagre sak'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
