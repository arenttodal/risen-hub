import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { workItems } from '@/db/schema';
import type { WorkItem } from '../types';
import type { NewWorkItem, WorkItemPatch } from '../validate';
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
  if (patch.priority !== undefined) changes.priority = patch.priority;
  if (patch.assignee !== undefined) changes.assignee = patch.assignee;
  if (patch.dueDate !== undefined) changes.dueDate = patch.dueDate;

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
