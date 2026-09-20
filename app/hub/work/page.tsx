import type { Metadata } from 'next';
import { Suspense } from 'react';
import { listPlaces, listProjects, listWorkItems } from '@/lib/risen/repository';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { WorkMasterList } from '@/components/risen/work-master-list';
import { WorkDetail } from '@/components/risen/work-detail';

export const metadata: Metadata = { title: 'Arbeid · Risen Hub' };

export default async function WorkPage() {
  const [workResult, projectsResult, placesResult] = await Promise.all([
    listWorkItems(),
    listProjects(),
    listPlaces(),
  ]);
  const projects = projectsResult.data.map(project => ({ id: project.id, name: project.name }));
  const places = placesResult.data.map(place => ({ id: place.id, name: place.name }));

  // Injected rather than read inside the view logic, so filtering stays pure
  // and testable against a fixed date.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="hub-content">
      <DataSourceNotice source={workResult.source} error={workResult.error} />
      {/* useSearchParams needs a boundary; the list is the whole page here. */}
      <Suspense fallback={<p className="panel-empty">Laster saker…</p>}>
        <WorkMasterList items={workResult.data} projects={projects} today={today} />
      </Suspense>
      <Suspense fallback={null}>
        <WorkDetail projects={projects} places={places} />
      </Suspense>
    </div>
  );
}
