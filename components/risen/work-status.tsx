'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkItem } from '@/lib/risen/types';

/**
 * Inline status change for one work item.
 *
 * Every transition is reversible — any status can be set back — so this needs
 * no confirmation step. It is a select rather than a set of buttons so the
 * whole flow works from the keyboard without extra tab stops per row.
 */

const statuses: { value: WorkItem['status']; label: string }[] = [
  { value: 'inbox', label: 'Innboks' },
  { value: 'planned', label: 'Planlagt' },
  { value: 'ready', label: 'Klar' },
  { value: 'in_progress', label: 'Pågår' },
  { value: 'blocked', label: 'Blokkert' },
  { value: 'done', label: 'Ferdig' },
  { value: 'cancelled', label: 'Avlyst' },
];

export function WorkStatusControl({ id, status, title }: { id: string; status: WorkItem['status']; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(status);
  const [failed, setFailed] = useState(false);

  async function change(next: WorkItem['status']) {
    const previous = value;
    setValue(next);
    setFailed(false);
    try {
      const response = await fetch(`/api/work/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error('save failed');
      startTransition(() => router.refresh());
    } catch {
      // Put the control back where it was rather than showing a status the
      // database does not hold.
      setValue(previous);
      setFailed(true);
    }
  }

  return (
    <span className={`work-status ${pending ? 'is-pending' : ''}`}>
      <label className="sr-only" htmlFor={`status-${id}`}>
        Status for {title}
      </label>
      <select
        id={`status-${id}`}
        value={value}
        disabled={pending}
        onChange={event => change(event.target.value as WorkItem['status'])}
      >
        {statuses.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {failed && (
        <span role="alert" className="work-status-error">
          Kunne ikke lagre
        </span>
      )}
    </span>
  );
}
