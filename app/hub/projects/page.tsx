import type { Metadata } from 'next';
import { listProjects } from '@/lib/risen/repository';
import { EmptyState } from '@/components/risen/empty-state';
import { ProjectCard } from '@/components/risen/project-card';
import { DataSourceNotice } from '@/components/risen/data-source-notice';

export const metadata: Metadata = { title: 'Projects · Risen Hub' };

export default async function ProjectsPage() {
  const { data: projects, source, error } = await listProjects();

  if (projects.length === 0) {
    return (
      <div className="hub-content">
        <DataSourceNotice source={source} error={error} />
        <EmptyState
          kicker="PROSJEKTER"
          title="Ingen prosjekter ennå"
          description="Et prosjekt er den kanoniske beholderen i Risen. Oppgaver, budsjett, søknader, dokumenter, arrangement og offentlig fremdrift peker alle tilbake hit, i stedet for å holde hver sin kopi."
          points={[
            'Ett prosjekt finnes én gang og gjenbrukes av alle moduler',
            'Synlighet settes per prosjekt: privat, medlemmer eller offentlig',
            'Fremdriften på den offentlige siden utledes av disse radene',
          ]}
          action={{ label: 'Se oversikten', href: '/hub' }}
          note="Opprettelse av prosjekter kommer sammen med skrivetilgangen mot databasen."
        />
      </div>
    );
  }

  const active = projects.filter(project => project.status === 'active').length;

  return (
    <div className="hub-content">
      <DataSourceNotice source={source} error={error} />
      <div className="page-head">
        <div>
          <span className="kicker">PROSJEKTER</span>
          <h2>Det vi bygger</h2>
        </div>
        <p>
          {projects.length} prosjekter · {active} aktive
        </p>
      </div>
      <div className="project-cards">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
