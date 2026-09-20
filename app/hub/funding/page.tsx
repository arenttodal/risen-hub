import type { Metadata } from 'next';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { listFundingAngles, listFundingSchemes, listProjects } from '@/lib/risen/repository';
import { isVerified } from '@/lib/risen/types';
import { daysUntil, formatDate } from '@/lib/risen/format';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { EmptyState } from '@/components/risen/empty-state';
import { schemeStatusLabels, strengthLabels } from '@/components/risen/funding-labels';

export const metadata: Metadata = { title: 'Finansiering · Risen Hub' };

/**
 * When the imported catalogue was last true. See docs/LEGACY-IMPORT-INVENTORY.md.
 * Shown rather than hidden: research with a date on it can be judged, research
 * without one just looks current.
 */
const LEGACY_SNAPSHOT = '2026-09-08';

export default async function FundingPage() {
  const [schemesResult, anglesResult, projectsResult] = await Promise.all([
    listFundingSchemes(),
    listFundingAngles(),
    listProjects(),
  ]);
  const schemes = schemesResult.data;
  const angles = anglesResult.data;
  const projectName = (id: string | null) =>
    id ? (projectsResult.data.find(project => project.id === id)?.name ?? 'Ukjent prosjekt') : 'Uten prosjekt';

  if (schemes.length === 0 && angles.length === 0) {
    return (
      <div className="hub-content">
        <DataSourceNotice source={schemesResult.source} error={schemesResult.error} />
        <EmptyState
          kicker="Finansiering"
          title="Ingen ordninger registrert"
          description="Støtteordninger, søknader, dokumentkrav og frister hører til de samme prosjektene som resten av plattformen."
          points={[
            'Hver frist krever kilde-URL og verifiseringsdato før den kan brukes',
            'Idébanken klassifiserer argumenter etter styrke',
            'Budsjett og dugnadstimer hører til prosjektet, ikke til søknaden',
          ]}
          action={{ label: 'Se prosjektene', href: '/hub/projects' }}
        />
      </div>
    );
  }

  const unverified = schemes.filter(scheme => !isVerified(scheme));
  const withoutSource = schemes.filter(scheme => !scheme.sourceUrl);
  const expired = schemes.filter(scheme => scheme.status === 'passed');
  const imported = schemes.filter(scheme => scheme.provenance);

  return (
    <div className="hub-content">
      <DataSourceNotice source={schemesResult.source} error={schemesResult.error} />

      <div className="page-head">
        <div>
          <span className="kicker">Finansiering</span>
          <h2>Ordninger og argumenter</h2>
        </div>
        <p>
          {schemes.length} ordninger · {angles.length} angles
        </p>
      </div>

      {unverified.length > 0 && (
        <p className="verify-banner" role="status">
          <TriangleAlert size={16} />
          <span>
            <strong>
              {unverified.length} av {schemes.length} ordninger er ikke bekreftet.
            </strong>{' '}
            Datoene under er research, ikke fakta.{' '}
            {withoutSource.length > 0 && (
              <>
                {withoutSource.length} av dem mangler kilde helt.{' '}
              </>
            )}
            {imported.length > 0 && (
              <>
                {imported.length} er importert fra Småbruk Støttehub slik den så ut{' '}
                {formatDate(LEGACY_SNAPSHOT)} og er ikke sjekket siden.{' '}
              </>
            )}
            {expired.length > 0 && (
              <>
                {expired.length} frist{expired.length === 1 ? '' : 'er'} har allerede gått ut.{' '}
              </>
            )}
            Sjekk ordningens egen side før noen planlegger etter dette.
          </span>
        </p>
      )}

      <section className="hub-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">Ordninger</span>
            <h3>Frister</h3>
          </div>
        </div>
        <table className="risen-table">
          <thead>
            <tr>
              <th>Ordning</th>
              <th>Vilkår</th>
              <th>Prosjekt</th>
              <th>Frist</th>
              <th>Status</th>
              <th>Kilde</th>
            </tr>
          </thead>
          <tbody>
            {schemes.map(scheme => {
              const days = daysUntil(scheme.deadlineAt);
              return (
                <tr key={scheme.id}>
                  <td>
                    <strong>{scheme.name}</strong>
                    {scheme.provider && <small>{scheme.provider}</small>}
                    {scheme.eligibilitySummary && <small>{scheme.eligibilitySummary}</small>}
                  </td>
                  <td>
                    {/* The funder's own wording, kept as text. "Normalt ca. 30 %"
                        is a hedge, and a number here would read as a promise. */}
                    {scheme.supportRate ?? '—'}
                    {scheme.matchRule && <small>{scheme.matchRule}</small>}
                    {scheme.cycle && <small>{scheme.cycle}</small>}
                  </td>
                  <td>{projectName(scheme.projectId)}</td>
                  <td>
                    {formatDate(scheme.deadlineAt)}
                    {days !== null && (
                      <small>{days < 0 ? `${Math.abs(days)} dager siden` : `om ${days} dager`}</small>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill scheme-${scheme.status}`}>
                      {schemeStatusLabels[scheme.status]}
                    </span>
                    {scheme.priorityNote && <small>{scheme.priorityNote}</small>}
                  </td>
                  <td>
                    {scheme.sourceUrl ? (
                      <a href={scheme.sourceUrl} rel="noreferrer noopener" target="_blank">
                        Kilde
                      </a>
                    ) : (
                      <span className="missing">Mangler</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="panel-foot-note">
          En frist uten kilde og verifiseringsdato regnes som uverifisert uansett hvor sannsynlig
          den ser ut. Det er en regel i CLAUDE.md, ikke en preferanse. Prioritetsnotatene under
          status er vurderinger som fulgte med researchen, ikke noe ordningen selv har sagt.
        </p>
      </section>

      <section className="hub-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">Idébank</span>
            <h3>Funding angles</h3>
          </div>
        </div>
        {angles.map(angle => (
          <article className="angle-row" key={angle.id}>
            <div className="angle-head">
              <span className="kicker">{strengthLabels[angle.strength]}</span>
              <strong>{angle.title}</strong>
            </div>
            {angle.description && <p>{angle.description}</p>}
            <div className="angle-foot">
              {angle.tags && <span>{angle.tags.split(',').join(' · ')}</span>}
              <span>
                Gjelder:{' '}
                {angle.projectIds.length === 0
                  ? 'ingen prosjekter'
                  : angle.projectIds.map((id, index) => (
                      <span key={id}>
                        {index > 0 && ', '}
                        <Link href={`/hub/projects/${id}`}>{projectName(id)}</Link>
                      </span>
                    ))}
              </span>
              {angle.missing && <span className="missing">Mangler: {angle.missing}</span>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
