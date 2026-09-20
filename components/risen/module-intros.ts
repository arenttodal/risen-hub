import type { EmptyStateAction } from './empty-state';

export interface ModuleIntro {
  kicker: string;
  title: string;
  description: string;
  points: string[];
  action: EmptyStateAction;
  note: string;
}

/**
 * Copy for the modules that have a route and a place in the data model, but no
 * screens yet. Each one names the records it will own and points at the part of
 * Risen that is live today, so the route never dead-ends.
 */
export const moduleIntros: Record<string, ModuleIntro> = {
  work: {
    kicker: 'MODUL UNDER ARBEID',
    title: 'Alt arbeid på ett sted',
    description:
      'Én innboks for oppgaver, reparasjoner, innkjøp og dugnadskandidater. Fangsten skal være liten: tittel, prosjekt eller sted, type og prioritet. Resten fylles ut senere.',
    points: [
      'Lagrede visninger: Innboks, Klar nå, Trenger oppfølging, Neste dugnad',
      'Planlegger som filtrerer på folk, tid, vær og materialer',
      'Kobling til prosjekt og bygning, aldri en egen prosjektliste',
    ],
    action: { label: 'Se oppgavene på prosjektene', href: '/hub/projects' },
    note: 'Oppgavene finnes allerede i datamodellen og vises på Oversikt og på hvert prosjekt. Denne modulen får egne visninger i neste steg.',
  },
  funding: {
    kicker: 'MODUL UNDER ARBEID',
    title: 'Finansiering med sporbare kilder',
    description:
      'Støtteordninger, søknader, gjenbrukbare svarblokker, dokumentkrav og frister — knyttet til de samme prosjektene som resten av plattformen.',
    points: [
      'Hver frist og hvert støttekrav krever kilde-URL, verifisert dato og status',
      'Idébank med klassifiserte funding angles',
      'Dokumentkrav og modenhetsscore per søknad',
    ],
    action: { label: 'Se prosjektene søknadene gjelder', href: '/hub/projects' },
    note: 'Ordninger importeres først når kilde og verifiseringsdato følger med. Ingen frister vises som gyldige uten dokumentert kilde.',
  },
  farm: {
    kicker: 'MODUL UNDER ARBEID',
    title: 'Gården som kilde til sannhet',
    description:
      'Bygninger, områder, tilstand, historikk, bilder og dokumentasjon. Et sted kan være knyttet til mange prosjekter over tid, og lever videre når prosjektene er ferdige.',
    points: [
      'Bygninger og områder med tilstand og historikk',
      'Dokumenter og bilder knyttet til sted, ikke bare til prosjekt',
      'Grunnlaget for både vernebegrunnelser og søknadsvedlegg',
    ],
    action: { label: 'Se prosjektene per sted', href: '/hub/projects' },
    note: 'Tabellen `places` ligger i databasen. Skjermbildene bygges etter at Prosjekter er ferdig.',
  },
  events: {
    kicker: 'MODUL UNDER ARBEID',
    title: 'Arrangement, dugnad og program',
    description:
      'Festival, residencies og samlinger med program, vaktlister og frivilligbehov — koblet til prosjektene arrangementene støtter.',
    points: [
      'Arrangement med program, vakter og påmelding',
      'Frivilligbehov som henter fra samme oppgavemodell som Work',
      'Grunnlag for de offentlige dugnadsdatoene på forsiden',
    ],
    action: { label: 'Se den offentlige forsiden', href: '/' },
    note: 'Den offentlige påmeldingen på forsiden er en forhåndsvisning med egen RSVP-tabell. Den flyttes hit når arrangementsmodellen er klar.',
  },
  community: {
    kicker: 'MODUL UNDER ARBEID',
    title: 'Foreningen og beslutningene',
    description:
      'Medlemmer, roller, forslag, avstemninger og vedtak. Rollefeltene `admin`, `member`, `volunteer` og `public` ligger allerede i datamodellen.',
    points: [
      'Medlemsregister med roller som senere styrer tilgang',
      'Forslag, avstemninger og vedtak med sporbar historikk',
      'Dokumenterte dugnadstimer som egeninnsats i søknader',
    ],
    action: { label: 'Se aktiviteten på prosjektene', href: '/hub/projects' },
    note: 'Innlogging og tilgangsstyring kommer i fase 3. Inntil da skal ingen reelle personopplysninger legges inn.',
  },
  public: {
    kicker: 'MODUL UNDER ARBEID',
    title: 'Kontrollert publisering',
    description:
      'Velg hvilke prosjekter, felter og oppdateringer som skal ut. Den offentlige siden leser en egen projeksjon og aldri de interne radene direkte.',
    points: [
      'Publiseringsvalg per felt, ikke per hele prosjekt',
      'Offentlige oppdateringer skrevet fra faktisk utført arbeid',
      'Crowdfunding-fremdrift utledet av interne tall',
    ],
    action: { label: 'Se den offentlige forsiden', href: '/' },
    note: 'Forsiden viser i dag en egen tekstlig forhåndsvisning. Den kobles til publiserte prosjektfelter når publiseringskontrollene er bygget.',
  },
};
