import type { Metadata } from 'next';
import { EmptyState } from '@/components/risen/empty-state';
import { moduleIntros } from '@/components/risen/module-intros';

const intro = moduleIntros.public;

export const metadata: Metadata = { title: 'Public · Risen Hub' };

export default function PublicPage() {
  return (
    <div className="hub-content">
      <EmptyState {...intro} />
    </div>
  );
}
