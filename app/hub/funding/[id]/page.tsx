import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';
import { getSchemeDetail } from '@/lib/risen/repository';
import { isVerified } from '@/lib/risen/types';
import { daysUntil, formatDate } from '@/lib/risen/format';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { schemeStatusLabels, strengthLabels } from '@/components/risen/funding-labels';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data } = await getSchemeDetail(id);
  return { title: data ? `${data.scheme.name} · Risen Hub` : 'Ordning · Risen Hub' };
}

/** The template's sections, in the order an application is actually written. */
const SECTION_LABELS: Record<string, string> = {
  summary: 'Sammendrag',
  need: 'Behov',
  method: 'Gjennomføring',
  impact: 'Virkning',
};
const SECTION_ORDER = ['summary', 'need', 'method', 'impact'];

export default async function SchemeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { data, source, error } = await getSchemeDetail(id);
  if (!data) notFound();

  const { scheme, requirements, angles, template } = data;
  const days = daysUntil(scheme.deadlineAt);
  const verified = isVerified(scheme);

  return (
    <div className="hub-content">
      <DataSourceNotice source={source} error={error} />

      <Link className="back-link" href="/hub/funding">
        <ArrowLeft size={15} />
        Alle ordninger
      </Link>

      <header className="detail-head">
        <div>
          <span className="kicker">{scheme.provider ?? 'Ukjent forvalter'}</span>
          <h2>{scheme.name}</h2>
          {scheme.eligibilitySummary && <p className="detail-summary">{scheme.eligibilitySummary}</p>}
          <div className="detail-tags">
            <span className={`status-pill scheme-${scheme.status}`}>
              {schemeStatusLabels[scheme.status]}
            </span>
            {scheme.priorityNote && <span className="status-pill">{scheme.priorityNote}</span>}
            {scheme.sourceUrl && (
              <a className="source-link" href={scheme.sourceUrl} rel="noreferrer noopener" target="_blank">
                Offisiell kilde <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        <aside className="detail-next">
          <span className="kicker">Frist</span>
          <strong className="tnum">{formatDate(scheme.deadlineAt)}</strong>
          <small>
            {days === null
              ? (scheme.cycle ?? 'Ingen frist registrert')
              : days < 0
                ? `${Math.abs(days)} dager siden`
                : `om ${days} dager`}
          </small>
        </aside>
      </header>

      {!verified && (
        <p className="verify-banner" role="status">
          <AlertTriangle size={16} />
          <span>
            <strong>Ikke bekreftet.</strong> Fristen og vilkårene under er research{' '}
            {scheme.provenance ? 'importert fra Småbruk Støttehub slik den så ut 8. september 2026' : 'lagt inn her'}
            , ikke sjekket mot ordningens egne sider. Bekreft dem før noen planlegger etter dem.
          </span>
        </p>
      )}

      <section className="metric-row">
        <article>
          <span>Støttegrad</span>
          <strong className="terms">{scheme.supportRate ?? '—'}</strong>
          <small>ordningens egne ord</small>
        </article>
        <article>
          <span>Egenandel</span>
          <strong className="terms">{scheme.matchRule ?? '—'}</strong>
          <small>ordningens egne ord</small>
        </article>
        <article>
          <span>Søknadssyklus</span>
          <strong className="terms">{scheme.cycle ?? '—'}</strong>
          <small>ordningens egne ord</small>
        </article>
        <article>
          <span>Dokumentkrav</span>
          <strong className="tnum">{requirements.length}</strong>
          <small>må leveres med søknaden</small>
        </article>
      </section>

      <div className="hub-grid">
        <section className="hub-panel">
          <div className="panel-heading">
            <div>
              <span className="kicker">Dokumentkrav</span>
              <h3>Dette må følge søknaden</h3>
            </div>
            <Link href="/hub/funding">Alle krav</Link>
          </div>
          {requirements.length === 0 ? (
            <p className="panel-empty">Ingen dokumentkrav er registrert for denne ordningen.</p>
          ) : (
            <ul className="requirement-list">
              {requirements.map(requirement => (
                <li key={requirement.id}>
                  <div>
                    <strong>{requirement.name}</strong>
                    {requirement.description ? (
                      <small>{requirement.description}</small>
                    ) : (
                      <small className="missing">Beskrivelse mangler i kildedata</small>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="panel-foot-note">
            Om dokumentene finnes er ikke registrert ennå. En tom liste her betyr at ingen har
            fylt det inn, ikke at ingenting mangler.
          </p>
        </section>

        <section className="hub-panel">
          <div className="panel-heading">
            <div>
              <span className="kicker">Argumenter</span>
              <h3>Sporene denne ordningen treffer</h3>
            </div>
          </div>
          {angles.length === 0 ? (
            <p className="panel-empty">Ingen argumenter er knyttet til denne ordningen.</p>
          ) : (
            angles.map(angle => (
              <article className="angle-row" key={angle.id}>
                <div className="angle-head">
                  <span className="kicker">{strengthLabels[angle.strength]}</span>
                  <strong>{angle.title}</strong>
                </div>
                {angle.description && <p>{angle.description}</p>}
              </article>
            ))
          )}
        </section>
      </div>

      {template && (
        <section className="hub-panel">
          <div className="panel-heading">
            <div>
              <span className="kicker">Søknadsmal</span>
              <h3>{template.title}</h3>
            </div>
          </div>
          {/* Placeholders are kept exactly as the archive wrote them. Filling them
              in is the applicant's job; a template that guessed would be signed
              without being read. */}
          <p className="panel-lead">
            Utkastet under er hentet uendret fra den gamle portalen. Feltene i hakeparentes må
            fylles inn — de er ikke gjetninger, de er hull som skal fylles.
          </p>
          <dl className="template-sections">
            {SECTION_ORDER.filter(key => template.sections[key]).map(key => (
              <div key={key}>
                <dt>{SECTION_LABELS[key] ?? key}</dt>
                <dd>{template.sections[key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
