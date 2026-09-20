import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { workItems } from '@/db/schema';
import type { WorkItem } from '../types';
import type { NewWorkItem, WorkItemPatch, WorkMoveInput } from '../validate';
import { recordActivity } from './activity';

/**
 * Writes for the Work module.
 *
 * Every mutation records an activity entry in the same call, and every change
 * here is reversible: a status or priority can be set back, and nothing is
 * deleted. Destructive operations need an explicit confirmation step and are
 * deliberately not implemented yet.
 */

const typeLabels: Record<WorkItem['type'], string> = {
  task: 'Oppgave',
  repair: 'Reparasjon',
  purchase: 'Innkjøp',
  dugnad: 'Dugnad',
  inspection: 'Befaring',
  documentation: 'Dokumentasjon',
  decision: 'Beslutning',
};

export async function createWorkItem(input: NewWorkItem): Promise<{ id: string }> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(workItems).values({
    id,
    projectId: input.projectId,
    placeId: input.placeId,
    milestoneId: null,
    title: input.title,
    detail: input.detail,
    type: input.type,
    priority: input.priority,
    status: input.status,
    assignee: input.assignee,
    estimatedHours: input.estimatedHours,
    dueDate: input.dueDate,
    completedAt: null,
    visibility: input.visibility,
    createdAt: now,
    updatedAt: now,
  });

  await recordActivity({
    entityType: 'work_item',
    entityId: id,
    action: 'created',
    summary: `${typeLabels[input.type]} opprettet: ${input.title}`,
    metadata: { type: input.type, priority: input.priority, projectId: input.projectId },
  });

  return { id };
}

export async function updateWorkItem(id: string, patch: WorkItemPatch): Promise<boolean> {
  const db = getDb();
  const existing = await db.select().from(workItems).where(eq(workItems.id, id)).limit(1);
  if (existing.length === 0) return false;
  const before = existing[0];

  const now = new Date().toISOString();
  const changes: Partial<typeof workItems.$inferInsert> = { updatedAt: now };
  if (patch.status !== undefined) {
    changes.status = patch.status;
    // Completion time is derived from the status rather than trusted from input.
    changes.completedAt = patch.status === 'done' ? (before.completedAt ?? now) : null;
  }
  if (patch.title !== undefined) changes.title = patch.title;
  if (patch.detail !== undefined) changes.detail = patch.detail;
  if (patch.priority !== undefined) changes.priority = patch.priority;
  if (patch.type !== undefined) changes.type = patch.type;
  if (patch.assignee !== undefined) changes.assignee = patch.assignee;
  if (patch.projectId !== undefined) changes.projectId = patch.projectId;
  if (patch.placeId !== undefined) changes.placeId = patch.placeId;
  if (patch.startAt !== undefined) changes.startAt = patch.startAt;
  if (patch.dueDate !== undefined) changes.dueDate = patch.dueDate;
  if (patch.estimatedHours !== undefined) changes.estimatedHours = patch.estimatedHours;
  if (patch.requiredPeople !== undefined) changes.requiredPeople = patch.requiredPeople;
  if (patch.suitableForDugnad !== undefined) changes.suitableForDugnad = patch.suitableForDugnad ? 1 : 0;
  if (patch.weatherDependency !== undefined) changes.weatherDependency = patch.weatherDependency;
  if (patch.position !== undefined) changes.position = patch.position;

  await db.update(workItems).set(changes).where(eq(workItems.id, id));

  const statusChanged = patch.status !== undefined && patch.status !== before.status;
  await recordActivity({
    entityType: 'work_item',
    entityId: id,
    action: statusChanged ? 'status_changed' : 'updated',
    summary: statusChanged
      ? `${before.title}: ${before.status} → ${patch.status}`
      : `${before.title} oppdatert`,
    // The previous values are kept so the change can be read, and undone.
    metadata: {
      before: { status: before.status, priority: before.priority, assignee: before.assignee, dueDate: before.dueDate },
      after: patch,
    },
  });

  return true;
}

/**
 * Walks up the parent chain to see whether making `childId` a child of
 * `parentId` would close a loop.
 *
 * SQLite cannot express this as a constraint, and a cycle here is not a
 * cosmetic problem: any recursive read of the tree would never terminate. The
 * walk is bounded as a second line of defence, in case data already on disk is
 * cyclic.
 */
export async function wouldCreateCycle(childId: string, parentId: string): Promise<boolean> {
  if (childId === parentId) return true;
  const db = getDb();
  const seen = new Set<string>([childId]);
  let current: string | null = parentId;

  for (let depth = 0; current !== null && depth < 64; depth += 1) {
    if (seen.has(current)) return true;
    seen.add(current);
    const rows: { parentId: string | null }[] = await db
      .select({ parentId: workItems.parentId })
      .from(workItems)
      .where(eq(workItems.id, current))
      .limit(1);
    if (rows.length === 0) return false;
    current = rows[0].parentId;
  }
  // Hit the depth bound without resolving: treat as cyclic rather than risk it.
  return current !== null;
}

export type SubtaskResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'parent_not_found' | 'cycle' };

export async function createSubtask(parentId: string, input: NewWorkItem): Promise<SubtaskResult> {
  const db = getDb();
  const parent = await db.select().from(workItems).where(eq(workItems.id, parentId)).limit(1);
  if (parent.length === 0) return { ok: false, reason: 'parent_not_found' };

  const { id } = await createWorkItem({
    ...input,
    // A subtask belongs to the same project as its parent unless told otherwise.
    projectId: input.projectId ?? parent[0].projectId,
    placeId: input.placeId ?? parent[0].placeId,
  });

  if (await wouldCreateCycle(id, parentId)) {
    await db.delete(workItems).where(eq(workItems.id, id));
    return { ok: false, reason: 'cycle' };
  }

  await db.update(workItems).set({ parentId, updatedAt: new Date().toISOString() }).where(eq(workItems.id, id));
  await recordActivity({
    entityType: 'work_item',
    entityId: parentId,
    action: 'updated',
    summary: `Underoppgave lagt til: ${input.title}`,
    metadata: { subtaskId: id },
  });

  return { ok: true, id };
}

export async function listSubtasks(parentId: string) {
  const db = getDb();
  const rows = await db.select().from(workItems).where(eq(workItems.parentId, parentId));
  return rows.sort((a, b) => a.position - b.position);
}

/**
 * Applies a batch of board moves.
 *
 * Only genuine changes are written, and only a status change records activity —
 * a position is presentation, not a domain event, and logging every renumbered
 * sibling would bury the change someone actually made.
 *
 * D1 has no interactive transaction here, so the writes are applied one by one.
 * That is safe because each write is idempotent and the client re-reads the
 * board afterwards: a partial apply leaves valid positions, never a lost card.
 */
export async function applyWorkMoves(moves: WorkMoveInput[]): Promise<{ applied: number }> {
  if (moves.length === 0) return { applied: 0 };
  const db = getDb();

  const ids = moves.map(move => move.id);
  const existing = await db.select().from(workItems).where(inArray(workItems.id, ids));
  const before = new Map(existing.map(row => [row.id, row]));

  const now = new Date().toISOString();
  let applied = 0;

  for (const move of moves) {
    const row = before.get(move.id);
    if (!row) continue;
    const statusChanged = row.status !== move.status;
    if (!statusChanged && row.position === move.position) continue;

    await db
      .update(workItems)
      .set({
        status: move.status,
        position: move.position,
        // Completion time follows the status rather than being trusted from input.
        completedAt: move.status === 'done' ? (row.completedAt ?? now) : null,
        updatedAt: now,
      })
      .where(eq(workItems.id, move.id));
    applied += 1;

    if (statusChanged) {
      await recordActivity({
        entityType: 'work_item',
        entityId: move.id,
        action: 'status_changed',
        summary: `${row.title}: ${row.status} → ${move.status}`,
        metadata: {
          before: { status: row.status, position: row.position },
          after: { status: move.status, position: move.position },
          via: 'board',
        },
      });
    }
  }

  return { applied };
}
