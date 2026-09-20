import type { Metadata } from 'next';
import { projects } from '@/data/risen';
import { EmptyState } from '@/components/risen/empty-state';
import { ProjectCard } from '@/components/risen/project-card';

export const metadata: Metadata = { title: 'Projects · Risen Hub' };

export default function ProjectsPage() {
  if (projects.length === 0) {
    return (
      <div className="hub-content">
        <EmptyState
          kicker="PROSJEKTER"
          title="Ingen prosjekter ennå"
          description="Et prosjekt er den kanoniske beholderen i Risen. Oppgaver, budsjett, søknader, dokumenter, arrangement og offentlig fremdrift peker alle tilbake hit."
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

  return (
    <div className="hub-content">
      <div className="page-head">
        <div>
          <span className="kicker">PROSJEKTER</span>
          <h2>Det vi bygger</h2>
        </div>
        <p>
          {projects.length} prosjekter · {projects.filter(project => project.status === 'active').length} aktive
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
