import type { AngleStrength, MemberRole, ProposalStatus, PublicationStatus, SchemeStatus } from '@/lib/risen/types';

/** Classification from PLATFORM-SPEC.md section 6. */
export const strengthLabels: Record<AngleStrength, string> = {
  core: 'Kjerneargument',
  strong: 'Sterkt støtteargument',
  context: 'Relevant kontekst',
  weak: 'Svak match',
  ineligible: 'Ikke støtteberettiget',
  needs_verification: 'Trenger faglig verifisering',
};

export const schemeStatusLabels: Record<SchemeStatus, string> = {
  unverified: 'Ikke bekreftet',
  verified: 'Bekreftet',
  passed: 'Utløpt',
  closed: 'Stengt',
};

export const publicationLabels: Record<PublicationStatus, string> = {
  draft: 'Utkast',
  review: 'Til gjennomgang',
  published: 'Publisert',
  archived: 'Arkivert',
};

export const roleLabels: Record<MemberRole, string> = {
  admin: 'Administrator',
  member: 'Medlem',
  volunteer: 'Frivillig',
};

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  draft: 'Utkast',
  open: 'Til avstemning',
  decided: 'Vedtatt',
  withdrawn: 'Trukket',
};
