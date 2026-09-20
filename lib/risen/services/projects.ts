import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { projects } from '@/db/schema';
import type { ProjectPatch } from '../validate';
import { recordActivity } from './activity';

/**
 * Writes for the Projects module.
 *
 * Publishing is deliberately absent: it changes what the outside world sees,
 * so it needs an explicit confirmation step and belongs with the Public module
 * (PLATFORM-SPEC.md phase G), not with an ordinary field edit.
 */
export async function updateProject(id: string, patch: ProjectPatch): Promise<boolean> {
  const db = getDb();
  const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (existing.length === 0) return false;
  const before = existing[0];

  const changes: Partial<typeof projects.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (patch.nextAction !== undefined) changes.nextAction = patch.nextAction;
  if (patch.status !== undefined) changes.status = patch.status;
  if (patch.progress !== undefined) changes.progress = patch.progress;

  await db.update(projects).set(changes).where(eq(projects.id, id));

  const statusChanged = patch.status !== undefined && patch.status !== before.status;
  await recordActivity({
    entityType: 'project',
    entityId: id,
    action: statusChanged ? 'status_changed' : 'updated',
    summary: statusChanged
      ? `${before.name}: ${before.status} → ${patch.status}`
      : `${before.name} oppdatert`,
    metadata: {
      before: { status: before.status, progress: before.progress, nextAction: before.nextAction },
      after: patch,
    },
  });

  return true;
}
