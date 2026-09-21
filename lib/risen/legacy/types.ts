/** The shapes the legacy archive actually uses, as found in `app.js`. */

export interface LegacyArea {
  id: string;
  n: string;
  sigil: string;
  name: string;
  desc: string;
  tags: string[];
}

export interface LegacyFund {
  id: string;
  name: string;
  owner: string;
  area: string[];
  deadline: string | null;
  cycle: string;
  support: string;
  match: string;
  status: string;
  url: string;
  desc: string;
  needs: string[];
  template: string;
}

export interface LegacyDoc {
  id: string;
  name: string;
  desc: string;
}

export interface LegacyTemplate {
  title: string;
  sections: Record<string, string>;
}

export interface LegacySource {
  TODAY: string;
  projects: LegacyArea[];
  funds: LegacyFund[];
  docs: LegacyDoc[];
  templateLibrary: Record<string, LegacyTemplate>;
}
