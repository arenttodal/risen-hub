import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Risen core schema.
 *
 * `projects` is the central aggregate: work, milestones, budgets, funding and
 * public updates all reference it and never copy it. `places` describe the
 * physical farm and outlive the projects that happen on them.
 *
 * Conventions:
 * - ids and timestamps are text; timestamps are ISO-8601 UTC strings
 * - money is stored as whole NOK in integer columns, never floats
 * - every publishable row carries `visibility`; public routes must read a
 *   published projection and never these rows unfiltered
 * - actor columns exist before authentication does, so the audit trail is
 *   already shaped for `admin | member | volunteer | public`
 */

/** `private | members | public` */
const visibility = (name = 'visibility') => text(name).notNull().default('private');
const createdAt = () => text('created_at').notNull();
const updatedAt = () => text('updated_at').notNull();

/**
 * Buildings, areas and other physical parts of the farm. A place may host many
 * projects over time, so condition and history live here rather than on the
 * project that happens to be touching it now.
 */
export const places = sqliteTable(
  'places',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** `building | area | structure | infrastructure` */
    kind: text('kind').notNull().default('building'),
    summary: text('summary'),
    /** `unknown | good | fair | poor | critical` — never asserted without documentation */
    condition: text('condition').notNull().default('unknown'),
    /** Set only when a qualified assessment exists; see CLAUDE.md rule 8. */
    conditionAssessedAt: text('condition_assessed_at'),
    conditionSourceUrl: text('condition_source_url'),
    visibility: visibility(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [uniqueIndex('places_slug').on(table.slug)],
);

/**
 * The canonical project record. Funding, Work and Public all point here; none
 * of them may keep their own project list.
 */
export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    summary: text('summary'),
    /** Editorial grouping shown in the interface, e.g. `Kulturarena`. */
    category: text('category').notNull().default('Ukategorisert'),
    /** `active | planning | paused | complete` */
    status: text('status').notNull().default('planning'),
    /** 0-100, maintained by the team rather than derived, for now. */
    progress: integer('progress').notNull().default(0),
    budgetNok: integer('budget_nok').notNull().default(0),
    fundedNok: integer('funded_nok').notNull().default(0),
    nextAction: text('next_action'),
    placeId: text('place_id').references(() => places.id, { onDelete: 'set null' }),
    visibility: visibility(),
    /** Null until someone explicitly publishes; presence is what the public projection reads. */
    publishedAt: text('published_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    uniqueIndex('projects_slug').on(table.slug),
    index('projects_status').on(table.status),
    index('projects_place').on(table.placeId),
  ],
);

/** Ordered outcomes inside a project. The public progress story is built from these. */
export const milestones = sqliteTable(
  'milestones',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    detail: text('detail'),
    /** `planned | next | doing | complete` */
    status: text('status').notNull().default('planned'),
    /** Explicit ordering; do not rely on insertion order. */
    position: integer('position').notNull().default(0),
    dueDate: text('due_date'),
    completedAt: text('completed_at'),
    visibility: visibility(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [index('milestones_project').on(table.projectId, table.position)],
);

/**
 * Tasks, repairs, purchases and dugnad candidates share one table so a single
 * capture flow can create any of them. `project_id` is nullable because an
 * inbox item is allowed to arrive before anyone has decided where it belongs.
 */
export const workItems = sqliteTable(
  'work_items',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    placeId: text('place_id').references(() => places.id, { onDelete: 'set null' }),
    milestoneId: text('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    detail: text('detail'),
    /** `task | repair | purchase | dugnad` */
    type: text('type').notNull().default('task'),
    /** `urgent | high | normal | low` */
    priority: text('priority').notNull().default('normal'),
    /** `inbox | ready | doing | blocked | done` */
    status: text('status').notNull().default('inbox'),
    /** Free text until Community owns a member register. */
    assignee: text('assignee'),
    estimatedHours: integer('estimated_hours'),
    dueDate: text('due_date'),
    completedAt: text('completed_at'),
    visibility: visibility(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    index('work_items_project').on(table.projectId),
    index('work_items_status').on(table.status, table.priority),
    index('work_items_place').on(table.placeId),
  ],
);

/**
 * Append-only trail of what changed. Public updates and application narratives
 * are drafted from these rows, so they are written on every mutation and never
 * edited afterwards.
 */
export const activityLog = sqliteTable(
  'activity_log',
  {
    id: text('id').primaryKey(),
    /** `project | milestone | work_item | place | rsvp` */
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    /** `created | updated | status_changed | published | unpublished | deleted` */
    action: text('action').notNull(),
    summary: text('summary').notNull(),
    /** Null until authentication exists; the column is here so the trail stays complete. */
    actorId: text('actor_id'),
    actorName: text('actor_name'),
    /** `admin | member | volunteer | public | system` */
    actorRole: text('actor_role').notNull().default('system'),
    /** JSON blob for the before/after detail a summary cannot carry. */
    metadata: text('metadata'),
    visibility: visibility(),
    createdAt: createdAt(),
  },
  table => [
    index('activity_entity').on(table.entityType, table.entityId),
    index('activity_created').on(table.createdAt),
  ],
);

/** Public preview RSVPs for the sample dugnad weekends on `/`. */
export const rsvps = sqliteTable(
  'rsvps',
  {
    id: text('id').primaryKey(),
    camp: text('camp').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    createdAt: text('created_at').notNull(),
  },
  table => [uniqueIndex('camp_email').on(table.camp, table.email)],
);

export type Place = typeof places.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type WorkItem = typeof workItems.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;
