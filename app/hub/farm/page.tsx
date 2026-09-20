import type { Metadata } from 'next';
import Link from 'next/link';
import { listPlaces, listProjects, listWorkItems } from '@/lib/risen/repository';
import { isOpenWork, type Place } from '@/lib/risen/types';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { EmptyState } from '@/components/risen/empty-state';
import { visibilityLabels } from '@/components/risen/project-card';

export const metadata: Metadata = { title: 'Gården · Risen Hub' };

const kindLabels: Record<Place['kind'], string> = {
  building: 'Bygning',
  area: 'Område',
  structure: 'Konstruksjon',
  infrastructure: 'Infrastruktur',
};

const conditionLabels: Record<Place['condition'], string> = {
  unknown: 'Ikke vurdert',
  good: 'God',
  fair: 'Brukbar',
  poor: 'Dårlig',
  critical: 'Kritisk',
};

export default async function FarmPage() {
  const [placesResult, projectsResult, workResult] = await Promise.all([
    listPlaces(),
    listProjects(),
    listWorkItems(),
  ]);
  const places = placesResult.data;

  if (places.length === 0) {
    return (
      <div className="hub-content">
        <DataSourceNotice source={placesResult.source} error={placesResult.error} />
        <EmptyState
          kicker="GÅRDEN"
          title="Ingen steder registrert"
          description="Bygninger og områder lever lenger enn prosjektene som skjer på dem, så tilstand, historikk og dokumentasjon hører hjemme her og ikke på et prosjekt som en dag blir ferdig."
          points={[
            'Ett sted kan ha mange prosjekter over tid',
            'Tilstand settes aldri uten dokumentasjon som backer den',
            'Bilder og dokumenter deles med søknader og offentlige oppdateringer',
          ]}
          action={{ label: 'Se prosjektene', href: '/hub/projects' }}
        />
      </div>
    );
  }

  return (
    <div className="hub-content">
      <DataSourceNotice source={placesResult.source} error={placesResult.error} />

      <div className="page-head">
        <div>
          <span className="kicker">GÅRDEN</span>
          <h2>Steder og bygninger</h2>
        </div>
        <p>{places.length} registrerte steder</p>
      </div>

      <div className="place-list">
        {places.map(place => {
          const linkedProjects = projectsResult.data.filter(project => project.placeId === place.id);
          const openWork = workResult.data.filter(item => item.placeId === place.id && isOpenWork(item));
          return (
            <article className="place-card" key={place.id}>
              <div className="place-head">
                <div>
                  <h3>{place.name}</h3>
                  <span>{kindLabels[place.kind]}</span>
                </div>
                <span className={`status-pill condition-${place.condition}`}>
                  {conditionLabels[place.condition]}
                </span>
              </div>

              {place.summary && <p className="place-summary">{place.summary}</p>}

              <dl className="place-facts">
                <div>
                  <dt>Prosjekter</dt>
                  <dd>
                    {linkedProjects.length === 0
                      ? 'Ingen'
                      : linkedProjects.map((project, index) => (
                          <span key={project.id}>
                            {index > 0 && ', '}
                            <Link href={`/hub/projects/${project.id}`}>{project.name}</Link>
                          </span>
                        ))}
                  </dd>
                </div>
                <div>
                  <dt>Åpne saker</dt>
                  <dd>{openWork.length}</dd>
                </div>
                <div>
                  <dt>Synlighet</dt>
                  <dd>{visibilityLabels[place.visibility]}</dd>
                </div>
              </dl>

              {place.condition === 'unknown' && (
                <p className="place-note">
                  Tilstanden er ikke vurdert. Ingen påstand om tilstand skal brukes i en søknad før
                  en fagperson har dokumentert den.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
