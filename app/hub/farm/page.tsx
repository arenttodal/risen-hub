import type { Metadata } from 'next';
import { EmptyState } from '@/components/risen/empty-state';
import { moduleIntros } from '@/components/risen/module-intros';

const intro = moduleIntros.farm;

export const metadata: Metadata = { title: 'Farm · Risen Hub' };

export default function FarmPage() {
  return (
    <div className="hub-content">
      <EmptyState {...intro} />
    </div>
  );
}
