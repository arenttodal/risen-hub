import type { Metadata } from 'next';
import { EmptyState } from '@/components/risen/empty-state';
import { moduleIntros } from '@/components/risen/module-intros';

const intro = moduleIntros.funding;

export const metadata: Metadata = { title: 'Funding · Risen Hub' };

export default function FundingPage() {
  return (
    <div className="hub-content">
      <EmptyState {...intro} />
    </div>
  );
}
