import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateAction {
  label: string;
  href: string;
}

/**
 * One shared empty state for both "this module has no records yet" and "this
 * module is not built yet". It always names what belongs here and offers a
 * single next action, rather than a generic "coming soon".
 */
export function EmptyState({
  kicker,
  title,
  description,
  points,
  action,
  note,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  points?: string[];
  action?: EmptyStateAction;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <span className="kicker">{kicker}</span>
      <h2>{title}</h2>
      <p className="empty-lead">{description}</p>
      {points && points.length > 0 && (
        <ul className="empty-points">
          {points.map(point => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
      {(action || children) && (
        <div className="empty-actions">
          {action && (
            <Link className="empty-action" href={action.href}>
              {action.label}
              <ArrowRight size={17} />
            </Link>
          )}
          {children}
        </div>
      )}
      {note && <p className="empty-note">{note}</p>}
    </section>
  );
}
