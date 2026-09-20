export type Visibility = 'private' | 'members' | 'public';
export type ProjectStatus = 'active' | 'planning' | 'paused' | 'complete';

export interface Project {
  id: string; name: string; area: string; status: ProjectStatus; progress: number;
  visibility: Visibility; nextAction: string; budgetNok: number; fundedNok: number;
}

export interface WorkItem {
  id: string; title: string; projectId: string; type: 'task' | 'repair' | 'purchase' | 'dugnad';
  priority: 'urgent' | 'high' | 'normal' | 'low'; status: 'inbox' | 'ready' | 'doing' | 'blocked' | 'done';
  assignee?: string; due?: string;
}

export const projects: Project[] = [
  { id: 'barn', name: 'Låven', area: 'Kulturarena', status: 'active', progress: 28, visibility: 'public', nextAction: 'Bestill tilstandsvurdering', budgetNok: 1300000, fundedNok: 364000 },
  { id: 'wall', name: 'Steinmuren', area: 'Kulturmiljø', status: 'active', progress: 42, visibility: 'public', nextAction: 'Last opp bilder etter stormen', budgetNok: 400000, fundedNok: 168000 },
  { id: 'workshop', name: 'Drift og verksted', area: 'Infrastruktur', status: 'planning', progress: 12, visibility: 'members', nextAction: 'Dokumenter dagens arbeidsområder', budgetNok: 750000, fundedNok: 0 },
  { id: 'festival', name: 'Sommerfestival', area: 'Arrangement', status: 'planning', progress: 18, visibility: 'public', nextAction: 'Lås programramme og artistbudsjett', budgetNok: 400000, fundedNok: 35000 },
];

export const workItems: WorkItem[] = [
  { id: 'w1', title: 'Dokumenter varme arbeider i gammel låve', projectId: 'workshop', type: 'task', priority: 'high', status: 'ready', assignee: 'Walid' },
  { id: 'w2', title: 'Reparer kjøkkendør', projectId: 'barn', type: 'repair', priority: 'normal', status: 'inbox' },
  { id: 'w3', title: 'Samle historiske bilder og gamle kart', projectId: 'barn', type: 'task', priority: 'high', status: 'doing', assignee: 'Arn' },
  { id: 'w4', title: 'Lag innkjøpsliste for neste dugnad', projectId: 'wall', type: 'purchase', priority: 'normal', status: 'ready' },
];

export const deadlines = [
  { date: '1. okt. 2026', title: 'TEFT', project: 'Risen som møteplass', state: 'urgent' },
  { date: '15. jan. 2027', title: 'Regionalt kulturfond', project: 'Festivalprogram', state: 'upcoming' },
  { date: '15. feb. 2027', title: 'Spillemidler kulturarena', project: 'Låven', state: 'upcoming' },
  { date: '1. mars 2027', title: 'Kulturrom / Gjenklang', project: 'Scene og akustikk', state: 'upcoming' },
];

export const fundingAngles = [
  { id: 'FA-014', title: 'Separere varme arbeider fra historisk låve', strength: 'Sterkt støtteargument', projects: ['Låven', 'Drift og verksted'], missing: 'Bilder og faglig risikovurdering' },
  { id: 'FA-015', title: 'Aktiv bruk som vern av gårdsmiljøet', strength: 'Kjerneargument', projects: ['Låven', 'Steinmuren'], missing: 'Historikk og bruksplan' },
];
