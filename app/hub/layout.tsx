import type { Metadata } from 'next';
import { HubShell } from '@/components/risen/hub-shell';

export const metadata: Metadata = {
  title: 'Risen Hub',
  description: 'Internt arbeidsrom for prosjekter, arbeid, finansiering og publisering på Risen.',
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <HubShell>{children}</HubShell>;
}
