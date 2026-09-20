'use client';
import { useState } from 'react';
import { ArrowRight, Bot, CalendarDays, CircleDollarSign, ClipboardList, FolderKanban, Hammer, Home, Landmark, Menu, Mountain, Search, Users, Wrench } from 'lucide-react';
import { deadlines, fundingAngles, projects, workItems } from '@/data/risen';
import { RisenAssistant } from './assistant';

const nav = [['Overview', Home], ['Projects', FolderKanban], ['Work', ClipboardList], ['Funding', CircleDollarSign], ['Farm', Landmark], ['Events', CalendarDays], ['Community', Users], ['Public', Mountain]] as const;
const money = (value: number) => new Intl.NumberFormat('nb-NO').format(value) + ' kr';

export function HubShell() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [active, setActive] = useState('Overview');
  return <div className="hub-app">
    <aside className={`hub-sidebar ${mobileNav ? 'is-open' : ''}`}>
      <a className="hub-brand" href="/"><Mountain size={25}/><span>risen<small>FARM PLATFORM</small></span></a>
      <nav>{nav.map(([label, Icon]) => <button className={active === label ? 'active' : ''} key={label} onClick={() => { setActive(label); setMobileNav(false); }}><Icon size={18}/>{label}</button>)}</nav>
      <div className="hub-sidebar-foot"><span>Workspace</span><strong>Risen gård</strong><small>Internal preview · no login</small></div>
    </aside>
    <main className="hub-main">
      <header className="hub-topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Meny"><Menu/></button><div><p>20. september 2026</p><h1>{active}</h1></div><div className="hub-actions"><button className="search-button"><Search size={17}/>Søk i Risen</button><button className="assistant-button" onClick={() => setAssistantOpen(true)}><Bot size={17}/>Assistant</button></div></header>
      {active === 'Overview' ? <Overview onAssistant={() => setAssistantOpen(true)}/> : <ModulePlaceholder module={active} />}
    </main>
    <RisenAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)}/>
  </div>;
}

function Overview({ onAssistant }: { onAssistant: () => void }) {
  return <div className="hub-content">
    <section className="focus-card"><div><span className="kicker">NESTE VIKTIGE TREKK</span><h2>Gjør TEFT-søknaden sendeklar.</h2><p>Fristen er 1. oktober. Tre dokumenter og to budsjettposter mangler.</p></div><button>Åpne søknaden <ArrowRight size={17}/></button></section>
    <section className="metric-row"><article><span>Aktive prosjekter</span><strong>{projects.filter(p => p.status === 'active').length}</strong><small>{projects.length} totalt</small></article><article><span>Åpne oppgaver</span><strong>{workItems.filter(w => w.status !== 'done').length}</strong><small>2 klare for dugnad</small></article><article><span>Finansiering kartlagt</span><strong>{money(projects.reduce((sum, p) => sum + p.fundedNok, 0))}</strong><small>på tvers av prosjekter</small></article><article><span>Needs attention</span><strong>5</strong><small>vedlegg og beslutninger</small></article></section>
    <div className="hub-grid">
      <section className="hub-panel projects-panel"><PanelHeading kicker="PROSJEKTER" title="Det vi bygger nå" action="Se alle"/>{projects.map(project => <article className="project-row" key={project.id}><div className="project-icon"><Hammer size={17}/></div><div className="project-copy"><strong>{project.name}</strong><span>{project.area} · {project.nextAction}</span><div className="thin-progress"><i style={{width: `${project.progress}%`}}/></div></div><b>{project.progress}%</b></article>)}</section>
      <section className="hub-panel deadline-panel"><PanelHeading kicker="FUNDING" title="Kommende frister" action="Kalender"/>{deadlines.map(deadline => <article className="deadline-row" key={deadline.title}><time>{deadline.date}</time><div><strong>{deadline.title}</strong><span>{deadline.project}</span></div><i className={deadline.state}/></article>)}</section>
      <section className="hub-panel work-panel"><PanelHeading kicker="WORK" title="Klar til å tas tak i" action="Ny sak"/>{workItems.slice(0,3).map(item => <article className="work-row" key={item.id}><span className={`priority ${item.priority}`}/><div><strong>{item.title}</strong><span>{projects.find(p => p.id === item.projectId)?.name} · {item.type}</span></div><small>{item.assignee || 'Ledig'}</small></article>)}</section>
      <section className="hub-panel angle-panel"><PanelHeading kicker="IDÉBANK" title="Funding angles" action="Legg til"/>{fundingAngles.map(angle => <article key={angle.id}><span>{angle.id} · {angle.strength}</span><strong>{angle.title}</strong><small>Mangler: {angle.missing}</small></article>)}<button className="ask-assistant" onClick={onAssistant}><Bot size={17}/>Vurder en ny idé med Assistant</button></section>
    </div>
  </div>;
}

function PanelHeading({kicker,title,action}:{kicker:string;title:string;action:string}) { return <div className="panel-heading"><div><span className="kicker">{kicker}</span><h3>{title}</h3></div><button>{action}</button></div>; }

function ModulePlaceholder({ module }: { module: string }) {
  const descriptions: Record<string,string> = { Projects: 'Ett prosjektobjekt kobler oppgaver, budsjett, finansiering, dokumenter, bilder, arrangement og offentlig fremdrift.', Work: 'Samlet innboks for oppgaver, feil, innkjøp, dugnader, ansvar og prioritering.', Funding: 'Støtteordninger, søknader, idébank, dokumentkrav, budsjetter og frister per prosjekt.', Farm: 'Gårdsprofil, bygninger, områder, historikk, tilstand, bilder og dokumentasjon.', Events: 'Festival, arrangement, residencies, kalender og frivilligbehov.', Community: 'Velforening, medlemmer, dugnad, avstemninger og beslutninger.', Public: 'Kontrollert publisering av prosjekter, crowdfunding, fremdrift og historier fra den interne databasen.' };
  return <div className="hub-content"><section className="module-placeholder"><span className="kicker">RISEN MODULE</span><h2>{module}</h2><p>{descriptions[module]}</p><div><Wrench size={19}/>Modulen har plass i arkitektur og datamodell og bygges ut i neste fase.</div></section></div>;
}
