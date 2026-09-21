'use client';
import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { WorkStatus } from '@/lib/risen/types';

/**
 * Inline capture inside a list group.
 *
 * Enter saves and keeps the field open for the next one; Escape closes. A
 * failed save keeps the typed text and the focus, because losing what someone
 * just wrote is worse than any error message.
 */
export function WorkInlineAdd({
  inheritStatus,
  inheritProjectId,
  inheritType,
  label = 'Legg til sak',
}: {
  inheritStatus?: WorkStatus;
  inheritProjectId?: string;
  inheritType?: string;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setTitle('');
    setError(null);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          status: inheritStatus ?? 'inbox',
          projectId: inheritProjectId ?? null,
          type: inheritType ?? 'task',
        }),
      });
      const body = (await response.json()) as { errors?: string[]; error?: string };
      if (!response.ok) {
        setError(body.errors?.[0] ?? body.error ?? 'Kunne ikke lagre.');
        return;
      }
      setTitle('');
      inputRef.current?.focus();
      router.refresh();
    } catch {
      setError('Kunne ikke lagre. Teksten er beholdt.');
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  if (!open) {
    return (
      <button type="button" className="inline-add-trigger" onClick={() => setOpen(true)}>
        <Plus size={14} />
        {label}
      </button>
    );
  }

  return (
    <form className="inline-add" onSubmit={submit}>
      <input
        ref={inputRef}
        autoFocus
        value={title}
        disabled={busy}
        onChange={event => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Hva må gjøres?"
        aria-label="Ny sak"
        maxLength={200}
      />
      <div className="inline-add-actions">
        <button type="submit" disabled={busy || !title.trim()}>
          {busy ? 'Lagrer…' : 'Legg til'}
        </button>
        <button type="button" className="ghost" onClick={close}>
          Avbryt
        </button>
      </div>
      {error && (
        <p className="inline-add-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
