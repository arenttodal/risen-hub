import type { Metadata } from 'next';
import { EmptyState } from '@/components/risen/empty-state';
import { moduleIntros } from '@/components/risen/module-intros';

const intro = moduleIntros.community;

export const metadata: Metadata = { title: 'Community · Risen Hub' };

export default function CommunityPage() {
  return (
    <div className="hub-content">
      <EmptyState {...intro} />
    </div>
  );
}
