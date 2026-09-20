import type { Metadata } from 'next';
import { HubShell } from '@/components/risen/hub-shell';
import { listPlaces, listProjects } from '@/lib/risen/repository';

export const metadata: Metadata = {
  title: 'Risen Hub',
  description: 'Internt arbeidsrom for prosjekter, arbeid, finansiering og publisering på Risen.',
};

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  // Quick capture needs these on every route, so the layout loads them once
  // rather than each page passing its own copy down.
  const [projectsResult, placesResult] = await Promise.all([listProjects(), listPlaces()]);

  return (
    <HubShell
      projects={projectsResult.data.map(project => ({ id: project.id, name: project.name }))}
      places={placesResult.data.map(place => ({ id: place.id, name: place.name }))}
    >
      {children}
    </HubShell>
  );
}
