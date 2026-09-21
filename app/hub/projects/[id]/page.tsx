import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, CircleDashed, CircleDot, MapPin } from 'lucide-react';
import { getProject, listMilestones, listPlaces, listWorkItems } from '@/lib/risen/repository';
import { fundedShare, type Milestone, type WorkItem } from '@/lib/risen/types';
import { projectShoppingTotals } from '@/lib/risen/services/shopping';
import { formatOre } from '@/lib/risen/money';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { ProjectShopping } from '@/components/risen/project-shopping';
import { ProjectGallery } from '@/components/risen/project-gallery';
import { EmptyState } from '@/components/risen/empty-state';
import { money, statusLabels, visibilityLabels } from '@/components/risen/project-card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: project } = await getProject(id);
  return { title: project ? `${project.name} · Risen Hub` : 'Prosjekt · Risen Hub' };
}

const milestoneStatusLabels: Record<Milestone['status'], string> = {
  planned: 'Planlagt',
  next: 'Neste',
  doing: 'Pågår',
  complete: 'Ferdig',
};

const workTypeLabels: Record<WorkItem['type'], string> = {
  task: 'Oppgave',
  repair: 'Reparasjon',
  purchase: 'Innkjøp',
  dugnad: 'Dugnad',
  inspection: 'Befaring',
  documentation: 'Dokumentasjon',
  decision: 'Beslutning',
};

const workStatusLabels: Record<WorkItem['status'], string> = {
  inbox: 'Innboks',
  planned: 'Planlagt',
  ready: 'Klar',
  in_progress: 'Pågår',
  blocked: 'Blokkert',
  done: 'Ferdig',
  cancelled: 'Avlyst',
};

function MilestoneIcon({ status }: { status: Milestone['status'] }) {
  if (status === 'complete') return <Check size={14} />;
  if (status === 'doing' || status === 'next') return <CircleDot size={14} />;
  return <CircleDashed size={14} />;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { data: project, source, error } = await getProject(id);
  if (!project) notFound();

  const [{ data: milestones }, { data: work }, { data: places }, shopping] = await Promise.all([
    listMilestones(project.id),
    listWorkItems(project.id),
    listPlaces(),
    projectShoppingTotals(project.id),
  ]);

  const place = places.find(candidate => candidate.id === project.placeId);
  const funded = fundedShare(project);
  const openWork = work.filter(item => item.status !== 'done');

  return (
    <div className="hub-content">
      <DataSourceNotice source={source} error={error} />

      <Link className="back-link" href="/hub/projects">
        <ArrowLeft size={15} />
        Alle prosjekter
      </Link>

      <header className="detail-head">
        <div>
          <span className="kicker">{project.category}</span>
          <h2>{project.name}</h2>
          {project.summary && <p className="detail-summary">{project.summary}</p>}
          <div className="detail-tags">
            <span className={`status-pill ${project.status}`}>{statusLabels[project.status]}</span>
            <span className={`visibility ${project.visibility}`}>
              {visibilityLabels[project.visibility]}
            </span>
            {place && (
              <Link className="place-tag" href="/hub/farm">
                <MapPin size={13} />
                {place.name}
              </Link>
            )}
          </div>
        </div>
        <div className="detail-aside">
          <ProjectGallery projectId={project.id} projectName={project.name} />
          {project.nextAction && (
            <aside className="detail-next">
              <span className="kicker">Neste steg</span>
              <strong>{project.nextAction}</strong>
            </aside>
          )}
        </div>
      </header>

      <section className="metric-row">
        <article>
          <span>Fremdrift</span>
          <strong>{project.progress}%</strong>
          <small>{milestones.filter(m => m.status === 'complete').length} av {milestones.length} milepæler</small>
        </article>
        <article>
          <span>Budsjett</span>
          <strong>{money(project.budgetNok)}</strong>
          <small>illustrativt anslag</small>
        </article>
        <article>
          <span>Finansiert</span>
          <strong>{money(project.fundedNok)}</strong>
          <small>{funded}% av budsjettet</small>
        </article>
        <article>
          <span>Åpne oppgaver</span>
          <strong>{openWork.length}</strong>
          <small>{work.length} totalt</small>
        </article>
      </section>

      <div className="hub-grid">
        <section className="hub-panel">
          <div className="panel-heading">
            <div>
              <span className="kicker">Milepæler</span>
              <h3>Veien videre</h3>
            </div>
          </div>
          {milestones.length === 0 ? (
            <p className="panel-empty">
              Ingen milepæler er satt ennå. Milepælene er det den offentlige fremdriftshistorien
              bygges av, så de bør settes før prosjektet publiseres.
            </p>
          ) : (
            <ol className="milestone-list">
              {milestones.map(milestone => (
                <li key={milestone.id} className={milestone.status}>
                  <span className="milestone-mark">
                    <MilestoneIcon status={milestone.status} />
                  </span>
                  <div>
                    <strong>{milestone.title}</strong>
                    {milestone.detail && <p>{milestone.detail}</p>}
                  </div>
                  <small>{milestoneStatusLabels[milestone.status]}</small>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="hub-panel">
          <div className="panel-heading">
            <div>
              <span className="kicker">Arbeid</span>
              <h3>Knyttet til prosjektet</h3>
            </div>
            <Link href="/hub/work">Work</Link>
          </div>
          {work.length === 0 ? (
            <p className="panel-empty">
              Ingen oppgaver er knyttet til dette prosjektet ennå.
            </p>
          ) : (
            work.map(item => (
              <article className="work-row" key={item.id}>
                <span className={`priority ${item.priority}`} />
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {workTypeLabels[item.type]} · {workStatusLabels[item.status]}
                  </span>
                </div>
                <small>{item.assignee || 'Ledig'}</small>
              </article>
            ))
          )}
        </section>
      </div>

      <section className="hub-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">Innkjøp</span>
            <h3>Materialer og kostnader</h3>
          </div>
          {/* One figure, in the heading. "Gjenstår" is forecast minus purchased
              and "estimert" only differs once someone records a real price, so
              neither earns a tile of its own — they go in the title attribute
              for anyone who wants the breakdown. */}
          {shopping.itemCount > 0 && (
            <span
              className="shop-total tnum"
              title={`Estimert ${formatOre(shopping.estimatedOre)} · kjøpt ${formatOre(
                shopping.purchasedOre,
              )} · gjenstår ${formatOre(shopping.remainingOre)}`}
            >
              {formatOre(shopping.forecastOre)}
              {shopping.purchasedOre > 0 && (
                <small>{formatOre(shopping.purchasedOre)} kjøpt</small>
              )}
            </span>
          )}
        </div>
        <ProjectShopping projectId={project.id} />
      </section>

      <div className="detail-pending">
        <EmptyState
          kicker="Ikke bygget ennå"
          title="Finansiering, budsjett, filer og publisering"
          description="Prosjektet er den kanoniske beholderen for alt dette. Fanene henger på den samme raden du ser over, slik at ingen modul lager sin egen kopi av prosjektet."
          points={[
            'Budsjettlinjer og finansieringsplan per prosjekt',
            'Søknader, dokumentkrav og modenhetsscore',
            'Filer og bilder, delt med Farm-modulen',
            'Valg av hvilke felter som publiseres offentlig',
          ]}
          action={{ label: 'Se hva Funding skal inneholde', href: '/hub/funding' }}
          note="Rekkefølgen i CLAUDE.md er Prosjekter og Work før Funding. Disse fanene bygges etter at skrivetilgang mot databasen er på plass."
        />
      </div>
    </div>
  );
}
