import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, Hammer } from 'lucide-react';
import { deadlines, fundingAngles, projects, workItems } from '@/data/risen';
import { AssistantTrigger } from '@/components/risen/assistant-context';

export const metadata: Metadata = { title: 'Overview · Risen Hub' };

const money = (value: number) => `${new Intl.NumberFormat('nb-NO').format(value)} kr`;

export default function OverviewPage() {
  return (
    <div className="hub-content">
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
          <strong>{workItems.filter(item => item.status !== 'done').length}</strong>
          <small>{workItems.filter(item => item.status === 'ready').length} klare for dugnad</small>
        </article>
        <article>
          <span>Finansiering kartlagt</span>
          <strong>{money(projects.reduce((sum, project) => sum + project.fundedNok, 0))}</strong>
          <small>på tvers av prosjekter</small>
        </article>
        <article>
          <span>Needs attention</span>
          <strong>5</strong>
          <small>vedlegg og beslutninger</small>
        </article>
      </section>

      <div className="hub-grid">
        <section className="hub-panel projects-panel">
          <PanelHeading kicker="PROSJEKTER" title="Det vi bygger nå" action="Se alle" href="/hub/projects" />
          {projects.map(project => (
            <article className="project-row" key={project.id}>
              <div className="project-icon">
                <Hammer size={17} />
              </div>
              <div className="project-copy">
                <strong>{project.name}</strong>
                <span>
                  {project.area} · {project.nextAction}
                </span>
                <div className="thin-progress">
                  <i style={{ width: `${project.progress}%` }} />
                </div>
              </div>
              <b>{project.progress}%</b>
            </article>
          ))}
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
        </section>

        <section className="hub-panel work-panel">
          <PanelHeading kicker="WORK" title="Klar til å tas tak i" action="Se alt arbeid" href="/hub/work" />
          {workItems.slice(0, 3).map(item => (
            <article className="work-row" key={item.id}>
              <span className={`priority ${item.priority}`} />
              <div>
                <strong>{item.title}</strong>
                <span>
                  {projects.find(project => project.id === item.projectId)?.name} · {item.type}
                </span>
              </div>
              <small>{item.assignee || 'Ledig'}</small>
            </article>
          ))}
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
