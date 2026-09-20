import { eq } from 'drizzle-orm';
import { getDb, tryGetDb } from '@/db';
import { workItemComments } from '@/db/schema';
import type { CommentInput } from '../validate';
import { recordActivity } from './activity';

/**
 * Comments on a work item.
 *
 * Separate from the activity log on purpose: a comment is something a person
 * chose to write, an activity entry is something the system observed. Deletes
 * are soft, so a thread keeps its shape and a reply never loses its context.
 */

export interface Comment {
  id: string;
  workItemId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export async function listComments(workItemId: string): Promise<Comment[]> {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db.select().from(workItemComments).where(eq(workItemComments.workItemId, workItemId));
  return rows
    .filter(row => row.deletedAt === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(row => ({
      id: row.id,
      workItemId: row.workItemId,
      authorName: row.authorName,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
}

export async function createComment(workItemId: string, input: CommentInput): Promise<{ id: string }> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.insert(workItemComments).values({
    id,
    workItemId,
    // Null until authentication exists; authorName carries it meanwhile.
    authorUserId: null,
    authorName: input.authorName,
    body: input.body,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  await recordActivity({
    entityType: 'work_item',
    entityId: workItemId,
    action: 'updated',
    summary: 'Kommentar lagt til',
    metadata: { commentId: id },
  });
  return { id };
}

/** Soft delete, so the thread keeps its shape and nothing is silently rewritten. */
export async function deleteComment(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(workItemComments).where(eq(workItemComments.id, id)).limit(1);
  if (rows.length === 0 || rows[0].deletedAt !== null) return false;
  await db
    .update(workItemComments)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(workItemComments.id, id));
  return true;
}
