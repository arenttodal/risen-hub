import type { Metadata } from 'next';
import { EmptyState } from '@/components/risen/empty-state';
import { moduleIntros } from '@/components/risen/module-intros';

const intro = moduleIntros.work;

export const metadata: Metadata = { title: 'Work · Risen Hub' };

export default function WorkPage() {
  return (
    <div className="hub-content">
      <EmptyState {...intro} />
    </div>
  );
}
