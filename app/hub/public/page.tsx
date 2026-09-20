import type { Metadata } from 'next';
import Link from 'next/link';
import { listEvents, listProjects } from '@/lib/risen/repository';
import { isPublished } from '@/lib/risen/types';
import { formatDate, money } from '@/lib/risen/format';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { visibilityLabels } from '@/components/risen/project-card';
import { publicationLabels } from '@/components/risen/funding-labels';

export const metadata: Metadata = { title: 'Offentlig · Risen Hub' };

export default async function PublicPage() {
  const [projectsResult, eventsResult] = await Promise.all([listProjects(), listEvents()]);
  const projects = projectsResult.data;
  const events = eventsResult.data;

  const published = projects.filter(isPublished);
  const withheld = projects.filter(project => !isPublished(project));

  return (
    <div className="hub-content">
      <DataSourceNotice source={projectsResult.source} error={projectsResult.error} />

      <div className="page-head">
        <div>
          <span className="kicker">Offentlig</span>
          <h2>Hva verden ser</h2>
        </div>
        <p>
          {published.length} av {projects.length} prosjekter er publisert
        </p>
      </div>

      <p className="verify-banner" role="status">
        <span>
          <strong>Publisering er et valg, ikke en bivirkning.</strong> Et prosjekt blir offentlig
          bare når det både er merket <code>public</code> og har en publiseringsdato. Forsiden
          viser i dag sin egen tekst; å koble den til disse radene er neste steg.
        </span>
      </p>

      <section className="hub-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">Publisert</span>
            <h3>Synlig for alle</h3>
          </div>
          <span className="count-tag">{published.length}</span>
        </div>
        {published.length === 0 ? (
          <p className="panel-empty">Ingen prosjekter er publisert.</p>
        ) : (
          published.map(project => (
            <article className="work-row" key={project.id}>
              <div>
                <strong>
                  <Link href={`/hub/projects/${project.id}`}>{project.name}</Link>
                </strong>
                <span>
                  Publisert {formatDate(project.publishedAt)} · {project.progress}% ·{' '}
                  {money(project.fundedNok)} av {money(project.budgetNok)}
                </span>
              </div>
              <small>{visibilityLabels[project.visibility]}</small>
            </article>
          ))
        )}
      </section>

      <section className="hub-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">Ikke publisert</span>
            <h3>Holdes internt</h3>
          </div>
          <span className="count-tag">{withheld.length}</span>
        </div>
        {withheld.length === 0 ? (
          <p className="panel-empty">Alle prosjekter er publisert.</p>
        ) : (
          withheld.map(project => (
            <article className="work-row" key={project.id}>
              <div>
                <strong>
                  <Link href={`/hub/projects/${project.id}`}>{project.name}</Link>
                </strong>
                <span>
                  {project.visibility === 'public'
                    ? 'Merket offentlig, men aldri publisert'
                    : `Synlighet: ${visibilityLabels[project.visibility]}`}
                </span>
              </div>
              <small>Skjult</small>
            </article>
          ))
        )}
      </section>

      <section className="hub-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">Arrangement</span>
            <h3>Publiseringsstatus</h3>
          </div>
          <span className="count-tag">{events.length}</span>
        </div>
        {events.map(event => (
          <article className="work-row" key={event.id}>
            <div>
              <strong>{event.title}</strong>
              <span>{event.startsAt ? formatDate(event.startsAt) : 'Dato ikke satt'}</span>
            </div>
            <small>{publicationLabels[event.publicationStatus]}</small>
          </article>
        ))}
      </section>
    </div>
  );
}
