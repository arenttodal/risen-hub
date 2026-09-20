'use client';
import { FormEvent, useState } from 'react';
import { ArrowUp, Sparkles, X } from 'lucide-react';

const prompts = ['Hva bør vi prioritere denne helgen?', 'Hva mangler TEFT-søknaden?', 'Gjør Walids idé til et funding angle'];

export function RisenAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setAnswer('Assistenten er klargjort som ett felles grensesnitt mot hele Risen-datamodellen. Koble server-endepunktet til valgt AI-leverandør før produksjon; API-nøkler skal aldri ligge i klienten.');
  }
  if (!open) return null;
  return <aside className="assistant-panel" aria-label="Risen Assistant">
    <header><div><Sparkles size={17}/><strong>Risen Assistant</strong></div><button onClick={onClose} aria-label="Lukk assistenten"><X size={18}/></button></header>
    <div className="assistant-body"><p className="assistant-intro">Spør på tvers av prosjekter, oppgaver, budsjetter, dokumenter og støtteordninger.</p><div className="assistant-prompts">{prompts.map(prompt => <button key={prompt} onClick={() => setQuery(prompt)}>{prompt}</button>)}</div>{answer && <div className="assistant-answer">{answer}</div>}</div>
    <form onSubmit={submit}><textarea value={query} onChange={event => setQuery(event.target.value)} placeholder="Spør om Risen…"/><button aria-label="Send"><ArrowUp size={18}/></button></form>
  </aside>;
}
