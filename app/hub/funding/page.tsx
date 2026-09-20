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
            Datoene under er research, ikke fakta. Ingen av dem har kilde eller verifiseringsdato,
            så de må sjekkes mot ordningens egne sider før noen planlegger etter dem.
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
                    {scheme.eligibilitySummary && <small>{scheme.eligibilitySummary}</small>}
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
          den ser ut. Det er en regel i CLAUDE.md, ikke en preferanse.
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
              <span className="kicker">
                {angle.id} · {strengthLabels[angle.strength]}
              </span>
              <strong>{angle.title}</strong>
            </div>
            {angle.description && <p>{angle.description}</p>}
            <div className="angle-foot">
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
