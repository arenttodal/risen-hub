import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, CircleCheck, Hammer } from 'lucide-react';
import { listFundingSchemes, listProjects, listWorkItems } from '@/lib/risen/repository';
import { listRecentActivity } from '@/lib/risen/services/activity';
import { chooseFocus, needsClarification, overviewMetrics, projectsInMotion, upcomingDeadlines } from '@/lib/risen/overview';
import { isOpenWork, isVerified } from '@/lib/risen/types';
import { formatDate } from '@/lib/risen/format';
import { JosefaTrigger } from '@/components/risen/josefa-context';
import { DataSourceNotice } from '@/components/risen/data-source-notice';

export const metadata: Metadata = { title: 'Oversikt · Risen Hub' };

/**
 * The overview answers one question: what should happen next.
 *
 * Everything on it is derived from the records. The headline used to be a
 * hand-written sentence about a TEFT application that no data supported; it is
 * now chosen by `chooseFocus`, which the tests hold to a fixed order of
 * severity. A page that cannot compute its own claim does not get to make one.
 */
export default async function OverviewPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [projectsResult, workResult, schemesResult, activity] = await Promise.all([
    listProjects(),
    listWorkItems(),
    listFundingSchemes(),
    listRecentActivity(6),
  ]);
  const projects = projectsResult.data;
  const work = workResult.data;
  const schemes = schemesResult.data;
  const context = { today };

  const focus = chooseFocus(work, schemes, context);
  const metrics = overviewMetrics(projects, work, schemes, context);
  const moving = projectsInMotion(projects, work);
  const deadlines = upcomingDeadlines(schemes, context);
  const unclear = needsClarification(work, context);
  const ready = work
    .filter(item => isOpenWork(item) && item.status === 'ready')
    .slice(0, 4);

  const projectName = (id: string | null) =>
    id ? (projects.find(project => project.id === id)?.name ?? 'Ukjent prosjekt') : 'Uten prosjekt';

  // One notice for the whole page rather than a badge on every row: the fact
  // that research is unverified is a property of the research, not of each line.
  const unverified = schemes.filter(scheme => !isVerified(scheme) && scheme.status !== 'closed');

  return (
    <div className="hub-content">
      <DataSourceNotice source={projectsResult.source} error={projectsResult.error} />

      <section className={`focus-card focus-${focus.kind}`}>
        <div>
          <span className="kicker">Neste viktige trekk</span>
          <h2>{focus.headline}</h2>
          <p>{focus.detail}</p>
        </div>
        <Link href={focus.action.href}>
          {focus.action.label} <ArrowRight size={17} />
        </Link>
      </section>

      <section className="metric-row">
        <article>
          <span>Prosjekter i bevegelse</span>
          <strong className="tnum">{moving.length}</strong>
          <small>{metrics.totalProjects} totalt</small>
        </article>
        <article>
          <span>Åpne oppgaver</span>
          <strong className="tnum">{metrics.openWork}</strong>
          <small>{metrics.readyWork} klare nå</small>
        </article>
        <article>
          <span>Neste frist</span>
          {metrics.nextDeadline ? (
            <>
              <strong className="tnum">
                {metrics.nextDeadline.days === 0 ? 'I dag' : `${metrics.nextDeadline.days} d`}
              </strong>
              <small>{metrics.nextDeadline.name}</small>
            </>
          ) : (
            <>
              <strong>—</strong>
              <small>ingen kommende frist registrert</small>
            </>
          )}
        </article>
        <article>
          <span>Trenger avklaring</span>
          <strong className="tnum">{metrics.needsAttention}</strong>
          <small>blokkert, forfalt eller uavklart</small>
        </article>
      </section>

      <div className="hub-grid">
        <section className="hub-panel projects-panel">
          <PanelHeading
            kicker="Prosjekter"
            title="Prosjekter i bevegelse"
            action="Se alle"
            href="/hub/projects"
          />
          {moving.length === 0 ? (
            <p className="panel-empty">
              Ingen prosjekter har åpne oppgaver. Et prosjekt uten arbeid står stille uansett hvilken
              status det har.
            </p>
          ) : (
            moving.map(project => {
              const open = work.filter(item => isOpenWork(item) && item.projectId === project.id);
              return (
                <article className="project-row" key={project.id}>
                  <div className="project-icon">
                    <Hammer size={17} />
                  </div>
                  <div className="project-copy">
                    <strong>
                      <Link href={`/hub/projects/${project.id}`}>{project.name}</Link>
                    </strong>
                    <span>
                      {open.length} åpne
                      {project.nextAction ? ` · ${project.nextAction}` : ''}
                    </span>
                    <div className="thin-progress">
                      <i style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <b className="tnum">{project.progress}%</b>
                </article>
              );
            })
          )}
        </section>

        <section className="hub-panel deadline-panel">
          <PanelHeading kicker="Finansiering" title="Kommende frister" action="Alle ordninger" href="/hub/funding" />
          {deadlines.length === 0 ? (
            <p className="panel-empty">Ingen kommende frister er registrert.</p>
          ) : (
            deadlines.slice(0, 3).map(({ scheme, days }) => (
              <article className="deadline-row" key={scheme.id}>
                <time className="tnum">{formatDate(scheme.deadlineAt)}</time>
                <div>
                  <strong>{scheme.name}</strong>
                  <span>{scheme.provider ?? projectName(scheme.projectId)}</span>
                </div>
                <span className={`chip${days <= 14 ? ' dn' : ''}`}>
                  {days === 0 ? 'i dag' : `om ${days} d`}
                </span>
              </article>
            ))
          )}
          {unverified.length > 0 && (
            <p className="panel-foot-note">
              <AlertTriangle size={14} /> {unverified.length} av {schemes.length} ordninger er ikke
              bekreftet mot ordningens egne sider. Datoene over er research, ikke fakta.
            </p>
          )}
        </section>

        <section className="hub-panel work-panel">
          <PanelHeading kicker="Arbeid" title="Klart til å tas tak i" action="Se alt arbeid" href="/hub/work" />
          {ready.length === 0 ? (
            <p className="panel-empty">
              Ingenting står som klart akkurat nå. En sak blir klar når den har et prosjekt og
              ingenting blokkerer den.
            </p>
          ) : (
            ready.map(item => (
              <article className="work-row" key={item.id}>
                <span className={`priority ${item.priority}`} />
                <div>
                  <strong>
                    <Link href={`/hub/work?task=${item.id}`}>{item.title}</Link>
                  </strong>
                  <span>
                    {projectName(item.projectId)}
                    {item.estimatedHours ? ` · ${item.estimatedHours} t` : ''}
                  </span>
                </div>
                <small>{item.assignee || 'Ledig'}</small>
              </article>
            ))
          )}
        </section>

        <section className="hub-panel clarify-panel">
          <PanelHeading
            kicker="Avklaring"
            title="Venter på en beslutning"
            action="Åpne arbeid"
            href="/hub/work?filter=attention"
          />
          {unclear.length === 0 ? (
            <p className="panel-empty">Ingenting venter på en avklaring.</p>
          ) : (
            unclear.slice(0, 4).map(row => (
              <article className="clarify-row" key={row.id}>
                <span className="reason-tag">{row.reason}</span>
                <Link href={row.href}>{row.title}</Link>
              </article>
            ))
          )}
          <JosefaTrigger className="ask-josefa">
            <CalendarClock size={16} />
            Spør Josefa om hva som bør gjøres først
          </JosefaTrigger>
        </section>
      </div>

      <section className="hub-panel">
        <PanelHeading kicker="Logg" title="Nylig aktivitet" action="Se alt arbeid" href="/hub/work" />
        {activity.length === 0 ? (
          <p className="panel-empty">
            Ingenting er registrert ennå. Loggen fylles av endringene dere gjør, og det er den
            offentlige fremdriftshistorien senere skrives fra.
          </p>
        ) : (
          <ul className="activity-list">
            {activity.map(entry => (
              <li key={entry.id}>
                <span>
                  <CircleCheck size={13} /> {entry.summary}
                </span>
                <time className="tnum">{formatDate(entry.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
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
