'use client';
import { type FormEvent, useState } from 'react';
import { BookOpen, X } from 'lucide-react';

/**
 * Josefa — the Risen assistant, named after the woman who owned Risen around a
 * hundred years ago.
 *
 * She is a working drawer, not a chat window: a book/journal metaphor, answers
 * as structured notes with citations to the records they came from, and
 * suggested prompts as ruled text rows. See CLAUDE-HANDOFF.md section 3.
 *
 * No provider is connected. Every answer here is a placeholder, and the panel
 * says so rather than implying a real retrieval happened.
 */

const prompts: { text: string; scope: string }[] = [
  { text: 'Hva bør vi prioritere denne helgen?', scope: 'Arbeid' },
  { text: 'Hva mangler TEFT-søknaden?', scope: 'Finansiering' },
  { text: 'Gjør Walids idé til et funding angle', scope: 'Idébank' },
];

interface Note {
  heading: string;
  body: string;
  citations: { label: string; detail: string }[];
}

const placeholderNote: Note = {
  heading: 'Josefa er ikke koblet til en modell ennå',
  body:
    'Grensesnittet er klart, men det finnes ingen server-endepunkt å spørre. Når det kommer, svarer Josefa med utdrag fra de faktiske radene i Risen, oppgir hvilke poster svaret bygger på, og foreslår handlinger du må bekrefte før noe skrives.',
  citations: [
    { label: 'Ingen kilder', detail: 'Ingen poster er lest, fordi ingen spørring ble utført.' },
  ],
};

export function Josefa({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [note, setNote] = useState<Note | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setNote(placeholderNote);
  }

  if (!open) return null;

  return (
    <aside className="josefa-panel" aria-label="Josefa">
      <header>
        <div className="josefa-title">
          <strong>Josefa</strong>
          <span>Risen-assistenten</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Lukk Josefa">
          <X size={18} />
        </button>
      </header>

      <div className="josefa-body">
        <p className="josefa-intro">
          Spør på tvers av prosjekter, arbeid, budsjett, dokumenter og støtteordninger. Josefa
          oppgir hvilke poster svaret bygger på, og foreslår handlinger før hun skriver noe.
        </p>

        <div className="josefa-prompts">
          {prompts.map(prompt => (
            <button key={prompt.text} type="button" onClick={() => setQuery(prompt.text)}>
              {prompt.text}
              <span>{prompt.scope}</span>
            </button>
          ))}
        </div>

        {note && (
          <article className="josefa-note">
            <span className="kicker">Notat</span>
            <h4>{note.heading}</h4>
            <p>{note.body}</p>
            <span className="kicker">Kilder</span>
            <ul className="josefa-citations">
              {note.citations.map(citation => (
                <li key={citation.label}>
                  <b>{citation.label}</b>
                  {citation.detail}
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>

      <form className="josefa-form" onSubmit={submit}>
        <label className="kicker" htmlFor="josefa-query">
          SPØR JOSEFA
        </label>
        <textarea
          id="josefa-query"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Hva lurer du på?"
        />
        <button type="submit">
          <BookOpen size={15} />
          Slå opp
        </button>
      </form>
    </aside>
  );
}
