/**
 * Input validation for every mutation boundary.
 *
 * PLATFORM-SPEC.md section 5 asks for "Zod or equivalent validation" at all API
 * boundaries. This is the equivalent: small, dependency-free and unit tested,
 * which matters more here than the breadth of a general-purpose library. Every
 * field an API route accepts passes through one of these parsers, and anything
 * not listed is dropped rather than written.
 */

import type { WorkItem } from './types';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const WORK_TYPES = ['task', 'repair', 'purchase', 'dugnad', 'inspection', 'documentation', 'decision'] as const;
const WORK_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
const WORK_STATUSES = ['inbox', 'planned', 'ready', 'in_progress', 'blocked', 'done', 'cancelled'] as const;
const VISIBILITIES = ['private', 'members', 'public'] as const;
const PROJECT_STATUSES = ['active', 'planning', 'paused', 'complete'] as const;

/** Trimmed non-empty string within bounds, or an error naming the field. */
function text(value: unknown, field: string, max: number, errors: string[], required = true): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) errors.push(`${field} er påkrevd`);
    return null;
  }
  if (typeof value !== 'string') {
    errors.push(`${field} må være tekst`);
    return null;
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    errors.push(`${field} kan ikke være tomt`);
    return null;
  }
  if (trimmed.length > max) {
    errors.push(`${field} kan ikke være lengre enn ${max} tegn`);
    return null;
  }
  return trimmed.length === 0 ? null : trimmed;
}

function oneOf<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  errors: string[],
  fallback: T,
): T {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  errors.push(`${field} må være en av: ${allowed.join(', ')}`);
  return fallback;
}

/** ISO calendar date (YYYY-MM-DD). Rejects impossible dates, not just bad shapes. */
function isoDate(value: unknown, field: string, errors: string[]): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${field} må være på formen ÅÅÅÅ-MM-DD`);
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    errors.push(`${field} er ikke en gyldig dato`);
    return null;
  }
  return value;
}

function wholeNumber(value: unknown, field: string, min: number, max: number, errors: string[]): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    errors.push(`${field} må være et helt tall`);
    return null;
  }
  if (parsed < min || parsed > max) {
    errors.push(`${field} må være mellom ${min} og ${max}`);
    return null;
  }
  return parsed;
}

function asObject(input: unknown, errors: string[]): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    errors.push('Ugyldig innhold');
    return {};
  }
  return input as Record<string, unknown>;
}

export interface NewWorkItem {
  title: string;
  detail: string | null;
  type: WorkItem['type'];
  priority: WorkItem['priority'];
  status: WorkItem['status'];
  projectId: string | null;
  placeId: string | null;
  assignee: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  visibility: WorkItem['visibility'];
}

/**
 * Quick capture keeps the required set deliberately small: a title and nothing
 * else. An item with no project lands in the inbox rather than being guessed
 * at (PLATFORM-SPEC.md section 7).
 */
export function parseNewWorkItem(input: unknown): Result<NewWorkItem> {
  const errors: string[] = [];
  const body = asObject(input, errors);
  const title = text(body.title, 'Tittel', 200, errors);

  const value: NewWorkItem = {
    title: title ?? '',
    detail: text(body.detail, 'Beskrivelse', 2000, errors, false),
    type: oneOf(body.type, 'Type', WORK_TYPES, errors, 'task'),
    priority: oneOf(body.priority, 'Prioritet', WORK_PRIORITIES, errors, 'normal'),
    status: oneOf(body.status, 'Status', WORK_STATUSES, errors, 'inbox'),
    projectId: text(body.projectId, 'Prosjekt', 64, errors, false),
    placeId: text(body.placeId, 'Sted', 64, errors, false),
    assignee: text(body.assignee, 'Ansvarlig', 100, errors, false),
    dueDate: isoDate(body.dueDate, 'Frist', errors),
    estimatedHours: wholeNumber(body.estimatedHours, 'Anslått tid', 0, 1000, errors),
    visibility: oneOf(body.visibility, 'Synlighet', VISIBILITIES, errors, 'members'),
  };

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

const WEATHER = ['any', 'dry', 'indoor', 'frost_free'] as const;

export interface WorkItemPatch {
  title?: string;
  detail?: string | null;
  status?: WorkItem['status'];
  priority?: WorkItem['priority'];
  type?: WorkItem['type'];
  assignee?: string | null;
  projectId?: string | null;
  placeId?: string | null;
  startAt?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  requiredPeople?: number | null;
  suitableForDugnad?: boolean;
  weatherDependency?: WorkItem['weatherDependency'];
  position?: number;
}

/** Only the fields present are changed, so a patch never blanks what it omits. */
export function parseWorkItemPatch(input: unknown): Result<WorkItemPatch> {
  const errors: string[] = [];
  const body = asObject(input, errors);
  const patch: WorkItemPatch = {};

  if ('title' in body) {
    const title = text(body.title, 'Tittel', 200, errors);
    if (title !== null) patch.title = title;
  }
  if ('detail' in body) patch.detail = text(body.detail, 'Beskrivelse', 4000, errors, false);
  if ('status' in body) patch.status = oneOf(body.status, 'Status', WORK_STATUSES, errors, 'inbox');
  if ('priority' in body) patch.priority = oneOf(body.priority, 'Prioritet', WORK_PRIORITIES, errors, 'normal');
  if ('type' in body) patch.type = oneOf(body.type, 'Type', WORK_TYPES, errors, 'task');
  if ('assignee' in body) patch.assignee = text(body.assignee, 'Ansvarlig', 100, errors, false);
  if ('projectId' in body) patch.projectId = text(body.projectId, 'Prosjekt', 64, errors, false);
  if ('placeId' in body) patch.placeId = text(body.placeId, 'Sted', 64, errors, false);
  if ('startAt' in body) patch.startAt = isoDate(body.startAt, 'Startdato', errors);
  if ('dueDate' in body) patch.dueDate = isoDate(body.dueDate, 'Frist', errors);
  if ('estimatedHours' in body) patch.estimatedHours = wholeNumber(body.estimatedHours, 'Anslått tid', 0, 1000, errors);
  if ('requiredPeople' in body) patch.requiredPeople = wholeNumber(body.requiredPeople, 'Antall personer', 0, 100, errors);
  if ('suitableForDugnad' in body) patch.suitableForDugnad = body.suitableForDugnad === true;
  if ('weatherDependency' in body) {
    patch.weatherDependency = body.weatherDependency === null
      ? null
      : oneOf(body.weatherDependency, 'Væravhengighet', WEATHER, errors, 'any');
  }
  if ('position' in body) {
    const position = wholeNumber(body.position, 'Posisjon', 0, 100000, errors);
    if (position !== null) patch.position = position;
  }

  if (Object.keys(patch).length === 0) errors.push('Ingen felter å oppdatere');
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: patch };
}

export interface CommentInput {
  body: string;
  authorName: string | null;
}

export function parseComment(input: unknown): Result<CommentInput> {
  const errors: string[] = [];
  const raw = asObject(input, errors);
  const value: CommentInput = {
    body: text(raw.body, 'Kommentar', 4000, errors) ?? '',
    authorName: text(raw.authorName, 'Navn', 100, errors, false),
  };
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

export interface ProjectPatch {
  nextAction?: string | null;
  status?: 'active' | 'planning' | 'paused' | 'complete';
  progress?: number;
}

export function parseProjectPatch(input: unknown): Result<ProjectPatch> {
  const errors: string[] = [];
  const body = asObject(input, errors);
  const patch: ProjectPatch = {};

  if ('nextAction' in body) patch.nextAction = text(body.nextAction, 'Neste steg', 200, errors, false);
  if ('status' in body) patch.status = oneOf(body.status, 'Status', PROJECT_STATUSES, errors, 'planning');
  if ('progress' in body) {
    const progress = wholeNumber(body.progress, 'Fremdrift', 0, 100, errors);
    if (progress !== null) patch.progress = progress;
  }

  if (Object.keys(patch).length === 0) errors.push('Ingen felter å oppdatere');
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: patch };
}
