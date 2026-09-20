import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { activityLog } from '@/db/schema';
import type { ActorRole } from '../types';

/**
 * The actor behind a mutation.
 *
 * There is no authentication yet, so every write is attributed to the system
 * with a null id. CLAUDE.md rule 5 keeps the shape ready: once sign-in exists,
 * only this resolver changes and the trail stays complete and comparable.
 */
export interface Actor {
  id: string | null;
  name: string | null;
  role: ActorRole;
}

export const SYSTEM_ACTOR: Actor = { id: null, name: null, role: 'system' };

export interface ActivityInput {
  entityType: 'project' | 'milestone' | 'work_item' | 'place' | 'rsvp';
  entityId: string;
  action: 'created' | 'updated' | 'status_changed' | 'published' | 'unpublished' | 'deleted';
  summary: string;
  /** Before/after detail a one-line summary cannot carry. Stored as JSON text. */
  metadata?: Record<string, unknown>;
  actor?: Actor;
}

/**
 * Appends to the audit trail. Called inside every mutation, never on its own:
 * a write that is not recorded here cannot be explained later, and public
 * updates and application narratives are drafted from these rows.
 */
export async function recordActivity(input: ActivityInput): Promise<void> {
  const db = getDb();
  const actor = input.actor ?? SYSTEM_ACTOR;
  await db.insert(activityLog).values({
    id: crypto.randomUUID(),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    summary: input.summary,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    visibility: 'private',
    createdAt: new Date().toISOString(),
  });
}

/** Most recent entries for one record, newest first. */
export async function listActivityFor(entityType: string, entityId: string, limit = 8) {
  const db = getDb();
  const rows = await db.select().from(activityLog).where(eq(activityLog.entityId, entityId));
  return rows
    .filter(row => row.entityType === entityType)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
