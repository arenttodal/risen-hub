import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Hammer } from 'lucide-react';
import { listFundingAngles, listFundingSchemes, listProjects, listWorkItems } from '@/lib/risen/repository';
import { formatDate, money } from '@/lib/risen/format';
import { isVerified } from '@/lib/risen/types';
import { strengthLabels } from '@/components/risen/funding-labels';
import { JosefaTrigger } from '@/components/risen/josefa-context';
import { DataSourceNotice } from '@/components/risen/data-source-notice';

export const metadata: Metadata = { title: 'Oversikt · Risen Hub' };

export default async function OverviewPage() {
  const [projectsResult, workResult, schemesResult, anglesResult] = await Promise.all([
    listProjects(),
    listWorkItems(),
    listFundingSchemes(),
    listFundingAngles(),
  ]);
  const projects = projectsResult.data;
  const work = workResult.data;
  const schemes = schemesResult.data;
  const angles = anglesResult.data;

  const openWork = work.filter(item => item.status !== 'done');
  const readyWork = work.filter(item => item.status === 'ready');
  const totalFunded = projects.reduce((sum, project) => sum + project.fundedNok, 0);

  return (
    <div className="hub-content">
      <DataSourceNotice source={projectsResult.source} error={projectsResult.error} />

      <section className="focus-card">
        <div>
          <span className="kicker">Neste viktige trekk</span>
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
          <PanelHeading kicker="Prosjekter" title="Det vi bygger nå" action="Se alle" href="/hub/projects" />
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
                    <Link href={`/hub/projects/${project.id}`}>{project.name}</Link>
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
          <PanelHeading kicker="Finansiering" title="Kommende frister" action="Kalender" href="/hub/funding" />
          {schemes.slice(0, 4).map(scheme => (
            <article className="deadline-row" key={scheme.id}>
              <time>{formatDate(scheme.deadlineAt)}</time>
              <div>
                <strong>{scheme.name}</strong>
                <span>{projects.find(project => project.id === scheme.projectId)?.name ?? 'Uten prosjekt'}</span>
              </div>
              <span className={`status-pill scheme-${isVerified(scheme) ? 'verified' : 'unverified'}`}>
                {isVerified(scheme) ? 'Bekreftet' : 'Ikke bekreftet'}
              </span>
            </article>
          ))}
          <p className="panel-foot-note">
            {schemes.filter(scheme => !isVerified(scheme)).length} av {schemes.length} frister er
            ikke bekreftet mot ordningens egne sider. De må verifiseres før noen planlegger etter
            dem.
          </p>
        </section>

        <section className="hub-panel work-panel">
          <PanelHeading kicker="Arbeid" title="Klar til å tas tak i" action="Se alt arbeid" href="/hub/work" />
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
          <PanelHeading kicker="Idébank" title="Funding angles" action="Se alle" href="/hub/funding" />
          {angles.map(angle => (
            <article key={angle.id}>
              <span>
                {angle.id} · {strengthLabels[angle.strength]}
              </span>
              <strong>{angle.title}</strong>
              {angle.missing && <small>Mangler: {angle.missing}</small>}
            </article>
          ))}
          <JosefaTrigger className="ask-josefa">
            <BookOpen size={16} />
            Vurder en ny idé med Josefa
          </JosefaTrigger>
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
