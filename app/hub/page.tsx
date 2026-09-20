import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, Hammer } from 'lucide-react';
import { deadlines, fundingAngles } from '@/data/risen';
import { listProjects, listWorkItems } from '@/lib/risen/repository';
import { AssistantTrigger } from '@/components/risen/assistant-context';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { money } from '@/components/risen/project-card';

export const metadata: Metadata = { title: 'Overview · Risen Hub' };

export default async function OverviewPage() {
  const [projectsResult, workResult] = await Promise.all([listProjects(), listWorkItems()]);
  const projects = projectsResult.data;
  const work = workResult.data;

  const openWork = work.filter(item => item.status !== 'done');
  const readyWork = work.filter(item => item.status === 'ready');
  const totalFunded = projects.reduce((sum, project) => sum + project.fundedNok, 0);

  return (
    <div className="hub-content">
      <DataSourceNotice source={projectsResult.source} error={projectsResult.error} />

      <section className="focus-card">
        <div>
          <span className="kicker">NESTE VIKTIGE TREKK</span>
          <h2>Gjør TEFT-søknaden sendeklar.</h2>
          <p>Fristen er 1. oktober. Tre dokumenter og to budsjettposter mangler.</p>
        </div>
        <Link href="/hub/funding">
          Åpne søknaden <ArrowRight size={17} />
        </Link>
      </section>

      <section className="metric-row">
        <article>
          <span>Aktive prosjekter</span>
          <strong>{projects.filter(project => project.status === 'active').length}</strong>
          <small>{projects.length} totalt</small>
        </article>
        <article>
          <span>Åpne oppgaver</span>
          <strong>{openWork.length}</strong>
          <small>{readyWork.length} klare for dugnad</small>
        </article>
        <article>
          <span>Finansiering kartlagt</span>
          <strong>{money(totalFunded)}</strong>
          <small>på tvers av prosjekter</small>
        </article>
        <article>
          <span>Trenger oppfølging</span>
          <strong>{work.filter(item => item.status === 'blocked' || item.priority === 'urgent').length}</strong>
          <small>blokkert eller haster</small>
        </article>
      </section>

      <div className="hub-grid">
        <section className="hub-panel projects-panel">
          <PanelHeading kicker="PROSJEKTER" title="Det vi bygger nå" action="Se alle" href="/hub/projects" />
          {projects.length === 0 ? (
            <p className="panel-empty">Ingen prosjekter er opprettet ennå.</p>
          ) : (
            projects.map(project => (
              <article className="project-row" key={project.id}>
                <div className="project-icon">
                  <Hammer size={17} />
                </div>
                <div className="project-copy">
                  <strong>
                    <Link href={`/hub/projects/${project.slug}`}>{project.name}</Link>
                  </strong>
                  <span>
                    {project.category}
                    {project.nextAction ? ` · ${project.nextAction}` : ''}
                  </span>
                  <div className="thin-progress">
                    <i style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
                <b>{project.progress}%</b>
              </article>
            ))
          )}
        </section>

        <section className="hub-panel deadline-panel">
          <PanelHeading kicker="FUNDING" title="Kommende frister" action="Kalender" href="/hub/funding" />
          {deadlines.map(deadline => (
            <article className="deadline-row" key={deadline.title}>
              <time>{deadline.date}</time>
              <div>
                <strong>{deadline.title}</strong>
                <span>{deadline.project}</span>
              </div>
              <i className={deadline.state} />
            </article>
          ))}
          <p className="panel-foot-note">
            Illustrative frister. Ingen av dem har kilde eller verifiseringsdato ennå, og de må
            bekreftes mot ordningens egne sider før de brukes.
          </p>
        </section>

        <section className="hub-panel work-panel">
          <PanelHeading kicker="WORK" title="Klar til å tas tak i" action="Se alt arbeid" href="/hub/work" />
          {openWork.length === 0 ? (
            <p className="panel-empty">Ingen åpne oppgaver.</p>
          ) : (
            openWork.slice(0, 3).map(item => (
              <article className="work-row" key={item.id}>
                <span className={`priority ${item.priority}`} />
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {projects.find(project => project.id === item.projectId)?.name ?? 'Uten prosjekt'}
                    {' · '}
                    {item.type}
                  </span>
                </div>
                <small>{item.assignee || 'Ledig'}</small>
              </article>
            ))
          )}
        </section>

        <section className="hub-panel angle-panel">
          <PanelHeading kicker="IDÉBANK" title="Funding angles" action="Se alle" href="/hub/funding" />
          {fundingAngles.map(angle => (
            <article key={angle.id}>
              <span>
                {angle.id} · {angle.strength}
              </span>
              <strong>{angle.title}</strong>
              <small>Mangler: {angle.missing}</small>
            </article>
          ))}
          <AssistantTrigger className="ask-assistant">
            <Bot size={17} />
            Vurder en ny idé med Assistant
          </AssistantTrigger>
        </section>
      </div>
    </div>
  );
}

function PanelHeading({
  kicker,
  title,
  action,
  href,
}: {
  kicker: string;
  title: string;
  action: string;
  href: string;
}) {
  return (
    <div className="panel-heading">
      <div>
        <span className="kicker">{kicker}</span>
        <h3>{title}</h3>
      </div>
      <Link href={href}>{action}</Link>
    </div>
  );
}
