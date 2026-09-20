import { Hammer } from 'lucide-react';
import type { Project } from '@/data/risen';

const money = (value: number) => `${new Intl.NumberFormat('nb-NO').format(value)} kr`;

const statusLabels: Record<Project['status'], string> = {
  active: 'Aktivt',
  planning: 'Planlegging',
  paused: 'På pause',
  complete: 'Ferdig',
};

const visibilityLabels: Record<Project['visibility'], string> = {
  private: 'Privat',
  members: 'Medlemmer',
  public: 'Offentlig',
};

export function ProjectCard({ project }: { project: Project }) {
  const funded = project.budgetNok > 0 ? Math.round((project.fundedNok / project.budgetNok) * 100) : 0;
  return (
    <article className="project-card">
      <div className="project-card-head">
        <div className="project-icon">
          <Hammer size={17} />
        </div>
        <div>
          <h3>{project.name}</h3>
          <span>{project.area}</span>
        </div>
        <span className={`status-pill ${project.status}`}>{statusLabels[project.status]}</span>
      </div>
      <p className="project-next">
        <span className="kicker">NESTE STEG</span>
        {project.nextAction}
      </p>
      <div className="project-card-meter">
        <div className="meter-line">
          <span>Fremdrift</span>
          <b>{project.progress}%</b>
        </div>
        <div className="thin-progress">
          <i style={{ width: `${project.progress}%` }} />
        </div>
      </div>
      <div className="project-card-meter">
        <div className="meter-line">
          <span>Finansiering</span>
          <b>
            {money(project.fundedNok)} av {money(project.budgetNok)}
          </b>
        </div>
        <div className="thin-progress">
          <i style={{ width: `${funded}%` }} />
        </div>
      </div>
      <footer className="project-card-foot">
        <span className={`visibility ${project.visibility}`}>{visibilityLabels[project.visibility]}</span>
      </footer>
    </article>
  );
}
