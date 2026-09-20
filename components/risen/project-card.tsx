import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { fundedShare, type Project } from '@/lib/risen/types';

export const money = (value: number) => `${new Intl.NumberFormat('nb-NO').format(value)} kr`;

export const statusLabels: Record<Project['status'], string> = {
  active: 'Aktivt',
  planning: 'Planlegging',
  paused: 'På pause',
  complete: 'Ferdig',
};

export const priorityLabels: Record<'urgent' | 'high' | 'normal' | 'low', string> = {
  urgent: 'Haster',
  high: 'Høy',
  normal: 'Normal',
  low: 'Lav',
};

export const visibilityLabels: Record<Project['visibility'], string> = {
  private: 'Privat',
  members: 'Medlemmer',
  public: 'Offentlig',
};

export function ProjectCard({ project }: { project: Project }) {
  const funded = fundedShare(project);
  return (
    <article className="project-card">
      <div className="project-card-head">
        <div>
          <h3>
            <Link href={`/hub/projects/${project.id}`}>{project.name}</Link>
          </h3>
          <span>{project.category}</span>
        </div>
        <span className={`status-pill ${project.status}`}>{statusLabels[project.status]}</span>
      </div>

      {project.nextAction && (
        <p className="project-next">
          <span className="kicker">Neste steg</span>
          {project.nextAction}
        </p>
      )}

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
        <span className={`visibility ${project.visibility}`}>
          {visibilityLabels[project.visibility]}
        </span>
        <Link className="card-link" href={`/hub/projects/${project.id}`}>
          Åpne <ArrowRight size={15} />
        </Link>
      </footer>
    </article>
  );
}
