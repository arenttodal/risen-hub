import type { Metadata } from 'next';
import Link from 'next/link';
import { listEvents, listProjects } from '@/lib/risen/repository';
import { formatDate } from '@/lib/risen/format';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { EmptyState } from '@/components/risen/empty-state';
import { publicationLabels } from '@/components/risen/funding-labels';
import { visibilityLabels } from '@/components/risen/project-card';

export const metadata: Metadata = { title: 'Arrangement · Risen Hub' };

export default async function EventsPage() {
  const [eventsResult, projectsResult] = await Promise.all([listEvents(), listProjects()]);
  const events = eventsResult.data;
  const projectName = (id: string | null) =>
    id ? (projectsResult.data.find(project => project.id === id)?.name ?? 'Ukjent prosjekt') : 'Uten prosjekt';

  if (events.length === 0) {
    return (
      <div className="hub-content">
        <DataSourceNotice source={eventsResult.source} error={eventsResult.error} />
        <EmptyState
          kicker="Arrangement"
          title="Ingen arrangement ennå"
          description="Festival, dugnadshelger og samlinger, med program, vaktlister og frivilligbehov — koblet til prosjektene de støtter."
          points={[
            'Et arrangement peker på prosjektet det bygger opp under',
            'Frivilligbehov henter fra samme oppgavemodell som Arbeid',
            'Publisering er et eget valg, ikke en bivirkning',
          ]}
          action={{ label: 'Se den offentlige forsiden', href: '/' }}
        />
      </div>
    );
  }

  return (
    <div className="hub-content">
      <DataSourceNotice source={eventsResult.source} error={eventsResult.error} />

      <div className="page-head">
        <div>
          <span className="kicker">Arrangement</span>
          <h2>Dugnad, festival og samlinger</h2>
        </div>
        <p>
          {events.filter(event => event.publicationStatus === 'published').length} publisert ·{' '}
          {events.length} totalt
        </p>
      </div>

      <div className="event-list">
        {events.map(event => {
          const signups = event.signups ?? 0;
          const capacity = event.capacity ?? 0;
          const share = capacity > 0 ? Math.min(100, Math.round((signups / capacity) * 100)) : 0;
          return (
            <article className="event-card" key={event.id}>
              <div className="event-head">
                <div>
                  <h3>{event.title}</h3>
                  <span>
                    {event.startsAt ? formatDate(event.startsAt) : 'Dato ikke satt'}
                    {event.endsAt && event.endsAt !== event.startsAt ? ` – ${formatDate(event.endsAt)}` : ''}
                    {' · '}
                    {projectName(event.projectId)}
                  </span>
                </div>
                <span className={`status-pill publication-${event.publicationStatus}`}>
                  {publicationLabels[event.publicationStatus]}
                </span>
              </div>

              {event.description && <p className="event-summary">{event.description}</p>}

              {event.rsvpKey ? (
                <div className="project-card-meter">
                  <div className="meter-line">
                    <span>Påmeldte</span>
                    <b>
                      {signups}
                      {capacity > 0 ? ` av ${capacity}` : ''}
                    </b>
                  </div>
                  <div className="thin-progress">
                    <i style={{ width: `${share}%` }} />
                  </div>
                </div>
              ) : (
                <p className="event-note">Ingen påmelding åpnet for dette arrangementet.</p>
              )}

              <footer className="project-card-foot">
                <span className={`visibility ${event.visibility}`}>
                  {visibilityLabels[event.visibility]}
                </span>
              </footer>
            </article>
          );
        })}
      </div>

      <p className="page-foot-note">
        Påmeldingstallene leses fra den offentlige forhåndsvisningen på{' '}
        <Link href="/">forsiden</Link>, som fortsatt eier sine egne rader. Arrangementene her er
        koblet til dem, ikke en kopi av dem.
      </p>
    </div>
  );
}
