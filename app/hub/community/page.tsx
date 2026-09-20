import type { Metadata } from 'next';
import { listMembers, listProposals } from '@/lib/risen/repository';
import { DataSourceNotice } from '@/components/risen/data-source-notice';
import { proposalStatusLabels, roleLabels } from '@/components/risen/funding-labels';
import { formatDate } from '@/lib/risen/format';

export const metadata: Metadata = { title: 'Fellesskap · Risen Hub' };

export default async function CommunityPage() {
  const [membersResult, proposalsResult] = await Promise.all([listMembers(), listProposals()]);
  const members = membersResult.data;
  const proposals = proposalsResult.data;

  return (
    <div className="hub-content">
      <DataSourceNotice source={membersResult.source} error={membersResult.error} />

      <div className="page-head">
        <div>
          <span className="kicker">FELLESSKAP</span>
          <h2>Medlemmer og beslutninger</h2>
        </div>
        <p>
          {members.length} medlemmer · {proposals.length} forslag
        </p>
      </div>

      <p className="verify-banner" role="status">
        <span>
          <strong>Tomt med vilje.</strong> Tabellene finnes og rollene <code>admin</code>,{' '}
          <code>member</code> og <code>volunteer</code> ligger klare, men det er ingen innlogging
          ennå. Før det finnes tilgangsstyring som kan beskytte dem, skal ingen reelle
          personopplysninger legges inn her.
        </span>
      </p>

      <section className="hub-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">MEDLEMMER</span>
            <h3>Hvem som er med</h3>
          </div>
          <span className="count-tag">{members.length}</span>
        </div>
        {members.length === 0 ? (
          <p className="panel-empty">
            Ingen medlemmer registrert. Registeret åpnes sammen med innlogging, slik at rollene
            faktisk styrer hva folk får se.
          </p>
        ) : (
          <table className="risen-table">
            <thead>
              <tr>
                <th>Navn</th>
                <th>Rolle</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.name}</strong>
                  </td>
                  <td>{roleLabels[member.role]}</td>
                  <td>{member.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="hub-panel">
        <div className="panel-heading">
          <div>
            <span className="kicker">FORSLAG</span>
            <h3>Det som skal avgjøres</h3>
          </div>
          <span className="count-tag">{proposals.length}</span>
        </div>
        {proposals.length === 0 ? (
          <p className="panel-empty">
            Ingen forslag ennå. Et forslag blir til et vedtak med dato og utfall, slik at
            beslutningene finnes igjen senere.
          </p>
        ) : (
          proposals.map(proposal => (
            <article className="work-row" key={proposal.id}>
              <div>
                <strong>{proposal.title}</strong>
                <span>
                  {proposalStatusLabels[proposal.status]}
                  {proposal.closesAt ? ` · frist ${formatDate(proposal.closesAt)}` : ''}
                </span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
