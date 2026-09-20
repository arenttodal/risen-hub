import type { Metadata } from 'next';
import { EmptyState } from '@/components/risen/empty-state';
import { moduleIntros } from '@/components/risen/module-intros';

const intro = moduleIntros.events;

export const metadata: Metadata = { title: 'Events · Risen Hub' };

export default function EventsPage() {
  return (
    <div className="hub-content">
      <EmptyState {...intro} />
    </div>
  );
}
