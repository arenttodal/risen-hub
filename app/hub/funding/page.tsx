import type { Metadata } from 'next';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import {
  listDocumentRequirements,
  listFundingAngles,
  listFundingSchemes,
  listProjects,
  listSchemeAngleLinks,
  type SchemeRequirement,
} from '@/lib/risen/repository';
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
  const [schemesResult, anglesResult, projectsResult, requirementsResult, angleLinks] = await Promise.all([
    listFundingSchemes(),
    listFundingAngles(),
    listProjects(),
    listDocumentRequirements(),
    listSchemeAngleLinks(),
  ]);
  const schemes = schemesResult.data;
  const angles = anglesResult.data;
  const requirements = requirementsResult.data;
  const schemeName = new Map(schemes.map(scheme => [scheme.id, scheme.name]));
  /**
   * Split at two schemes.
   *
   * Twenty of these are wanted by exactly one scheme, and listing them all at
   * once buries the three that unlock most applications. The tail is still
   * here, one click away — it is a real requirement, just not a priority.
   */
  const shared = requirements.filter(requirement => requirement.schemeIds.length > 1);
  const singles = requirements.filter(requirement => requirement.schemeIds.length <= 1);
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
                    <strong>
                      <Link href={`/hub/funding/${scheme.id}`}>{scheme.name}</Link>
                    </strong>
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

      {requirements.length > 0 && (
        <section className="hub-panel">
          <div className="panel-heading">
            <div>
              <span className="kicker">Dokumentkrav</span>
              <h3>Det samme papiret går igjen</h3>
            </div>
            <span className="count-tag tnum">{requirements.length} krav</span>
          </div>
          <p className="panel-lead">
            Sortert etter hvor mange ordninger som ber om det. Et dokument flere ordninger vil ha
            er verdt å lage først — det låser opp flest søknader for samme arbeid.
          </p>
          <RequirementList rows={shared} schemeName={schemeName} />
          {singles.length > 0 && (
            <details className="requirement-rest">
              <summary>
                {singles.length} krav som bare én ordning ber om
              </summary>
              <RequirementList rows={singles} schemeName={schemeName} />
            </details>
          )}
          <p className="panel-foot-note">
            Om dokumentene faktisk finnes er ikke importert — den gamle appen lagret det bare i
            nettleseren. Den statusen må fylles inn her.
          </p>
        </section>
      )}

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
              {(() => {
                const forSchemes = angleLinks.filter(link => link.angleId === angle.id);
                return forSchemes.length > 0 ? (
                  <span>
                    {forSchemes.length} {forSchemes.length === 1 ? 'ordning' : 'ordninger'}
                  </span>
                ) : null;
              })()}
              {angle.missing && <span className="missing">Mangler: {angle.missing}</span>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function RequirementList({
  rows,
  schemeName,
}: {
  rows: SchemeRequirement[];
  schemeName: Map<string, string>;
}) {
  return (
    <ul className="requirement-list">
      {rows.map(requirement => (
        <li key={requirement.id}>
          <div>
            <strong>{requirement.name}</strong>
            {requirement.description ? (
              <small>{requirement.description}</small>
            ) : (
              /* The archive asked for this without ever describing it. Saying so is
                 the honest option; writing a description would invent a funder's
                 demand. See docs/LEGACY-IMPORT-INVENTORY.md. */
              <small className="missing">Beskrivelse mangler i kildedata</small>
            )}
          </div>
          <span
            className="count-tag tnum"
            title={requirement.schemeIds.map(id => schemeName.get(id) ?? id).join(', ')}
          >
            {requirement.schemeIds.length}{' '}
            {requirement.schemeIds.length === 1 ? 'ordning' : 'ordninger'}
          </span>
        </li>
      ))}
    </ul>
  );
}
