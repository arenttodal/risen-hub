import type { Metadata } from 'next';
import Link from 'next/link';
import { listProjects, listWorkItems } from '@/lib/risen/repository';
import { byPriority, isOpenWork, type WorkItem } from '@/lib/risen/types';
import { formatDate } from '@/lib/risen/format';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { EmptyState } from '@/components/risen/empty-state';
import { WorkStatusControl } from '@/components/risen/work-status';

export const metadata: Metadata = { title: 'Arbeid · Risen Hub' };

const typeLabels: Record<WorkItem['type'], string> = {
  task: 'Oppgave',
  repair: 'Reparasjon',
  purchase: 'Innkjøp',
  dugnad: 'Dugnad',
  inspection: 'Befaring',
  documentation: 'Dokumentasjon',
  decision: 'Beslutning',
};

const statusLabels: Record<WorkItem['status'], string> = {
  inbox: 'Innboks',
  planned: 'Planlagt',
  ready: 'Klar',
  in_progress: 'Pågår',
  blocked: 'Blokkert',
  done: 'Ferdig',
  cancelled: 'Avlyst',
};

/** The saved views from PLATFORM-SPEC.md section 7. */
const views: { key: string; label: string; describe: string; match: (item: WorkItem) => boolean }[] = [
  { key: 'inbox', label: 'Innboks', describe: 'Fanget opp, ikke plassert ennå', match: item => item.status === 'inbox' },
  { key: 'ready', label: 'Klar nå', describe: 'Kan tas tak i med en gang', match: item => item.status === 'ready' },
  { key: 'in_progress', label: 'Pågår', describe: 'Noen har begynt', match: item => item.status === 'in_progress' },
  { key: 'attention', label: 'Trenger oppfølging', describe: 'Blokkert eller haster', match: item => item.status === 'blocked' || item.priority === 'urgent' },
  { key: 'dugnad', label: 'Neste dugnad', describe: 'Egnet for en arbeidshelg', match: item => item.suitableForDugnad || item.type === 'dugnad' },
  { key: 'purchase', label: 'Innkjøp', describe: 'Må kjøpes inn', match: item => item.type === 'purchase' },
];

export default async function WorkPage() {
  const [workResult, projectsResult] = await Promise.all([listWorkItems(), listProjects()]);
  const work = workResult.data;
  const projects = projectsResult.data;
  const projectName = (id: string | null) =>
    id ? (projects.find(project => project.id === id)?.name ?? 'Ukjent prosjekt') : 'Uten prosjekt';

  if (work.length === 0) {
    return (
      <div className="hub-content">
        <DataSourceNotice source={workResult.source} error={workResult.error} />
        <EmptyState
          kicker="Arbeid"
          title="Ingen saker ennå"
          description="Oppgaver, reparasjoner, innkjøp og dugnadskandidater deler én innboks, slik at én fangst kan bli hva som helst av det. Kravene er små med vilje: tittel, prosjekt eller sted, type og prioritet."
          points={[
            'Saker peker på prosjekt og sted, aldri på en egen prosjektliste',
            'En sak uten prosjekt havner i Innboks i stedet for å gjettes på',
            'Ferdig arbeid blir grunnlag for offentlige oppdateringer',
          ]}
          action={{ label: 'Se prosjektene', href: '/hub/projects' }}
          note="Å opprette saker kommer sammen med skrivetilgangen mot databasen."
        />
      </div>
    );
  }

  const open = work.filter(isOpenWork).sort(byPriority);
  const done = work.filter(item => !isOpenWork(item));

  return (
    <div className="hub-content">
      <DataSourceNotice source={workResult.source} error={workResult.error} />

      <div className="page-head">
        <div>
          <span className="kicker">Arbeid</span>
          <h2>Alt som står på gården</h2>
        </div>
        <p>
          {open.length} åpne · {done.length} ferdige
        </p>
      </div>

      <section className="view-row">
        {views.map(view => {
          const items = work.filter(item => isOpenWork(item) && view.match(item));
          return (
            <article className="view-tile" key={view.key}>
              <strong>{items.length}</strong>
              <span>{view.label}</span>
              <small>{view.describe}</small>
            </article>
          );
        })}
      </section>

      {views.map(view => {
        const items = work.filter(item => isOpenWork(item) && view.match(item)).sort(byPriority);
        if (items.length === 0) return null;
        return (
          <section className="hub-panel work-view" key={view.key}>
            <div className="panel-heading">
              <div>
                <span className="kicker">{view.label}</span>
                <h3>{view.describe}</h3>
              </div>
              <span className="count-tag">{items.length}</span>
            </div>
            {items.map(item => (
              <article className="work-row" key={item.id}>
                <span className={`priority ${item.priority}`} />
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {projectName(item.projectId)} · {typeLabels[item.type]}
                    {item.estimatedHours ? ` · ${item.estimatedHours} t` : ''}
                    {item.dueDate ? ` · frist ${formatDate(item.dueDate)}` : ''}
                  </span>
                </div>
                <small>{item.assignee || 'Ledig'}</small>
                <WorkStatusControl id={item.id} status={item.status} title={item.title} />
              </article>
            ))}
          </section>
        );
      })}

      {done.length > 0 && (
        <section className="hub-panel work-view">
          <div className="panel-heading">
            <div>
              <span className="kicker">Ferdig</span>
              <h3>Gjort unna</h3>
            </div>
            <span className="count-tag">{done.length}</span>
          </div>
          {done.map(item => (
            <article className="work-row is-done" key={item.id}>
              <span className={`priority ${item.priority}`} />
              <div>
                <strong>{item.title}</strong>
                <span>
                  {projectName(item.projectId)} · {statusLabels[item.status]}
                </span>
              </div>
              <small>{item.assignee || '—'}</small>
            </article>
          ))}
        </section>
      )}

      <p className="page-foot-note">
        Status kan endres direkte i listene over, og hver endring skrives til aktivitetsloggen.
        Nye saker opprettes med <strong>Ny sak</strong> i toppraden, eller ved å trykke{' '}
        <kbd>N</kbd>. Se <Link href="/hub/projects">Prosjekter</Link> for hva hver sak henger på.
      </p>
    </div>
  );
}
