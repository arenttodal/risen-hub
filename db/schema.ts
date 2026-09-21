import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
    /**
     * Subtasks are work items too, so a subtask can carry its own status,
     * assignee and deadline without a second model. Cycles are rejected in the
     * service layer, which SQLite cannot express as a constraint.
     */
    parentId: text('parent_id'),
    title: text('title').notNull(),
    detail: text('detail'),
    /** `task | repair | purchase | dugnad | inspection | documentation | decision` */
    type: text('type').notNull().default('task'),
    /** `urgent | high | normal | low` */
    priority: text('priority').notNull().default('normal'),
    /** `inbox | planned | ready | in_progress | blocked | done | cancelled` */
    status: text('status').notNull().default('inbox'),
    /** Free text until Community owns a member register. */
    assignee: text('assignee'),
    /** Whole hours. The unit the farm actually plans in. */
    estimatedHours: integer('estimated_hours'),
    /** How many people the job needs at once. */
    requiredPeople: integer('required_people'),
    /** 0/1. Whether this is sensible work for a volunteer weekend. */
    suitableForDugnad: integer('suitable_for_dugnad').notNull().default(0),
    /** `any | dry | indoor | frost_free` — filters the planner when rain is forecast. */
    weatherDependency: text('weather_dependency'),
    startAt: text('start_at'),
    dueDate: text('due_date'),
    completedAt: text('completed_at'),
    /** Manual ordering inside a list or board column. */
    position: integer('position').notNull().default(0),
    createdBy: text('created_by'),
    visibility: visibility(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    index('work_items_project').on(table.projectId),
    index('work_items_status').on(table.status, table.priority),
    index('work_items_place').on(table.placeId),
    index('work_items_parent').on(table.parentId),
    index('work_items_assignee').on(table.assignee),
    index('work_items_due').on(table.dueDate),
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

/**
 * Funding schemes. CLAUDE.md rule 8: a deadline or eligibility claim may only
 * be presented as current when it carries a source and a verification date.
 * `status` starts as `unverified` and nothing may show it as live until a
 * person has checked the scheme's own pages and filled in `sourceUrl` and
 * `verifiedAt`.
 */
export const fundingSchemes = sqliteTable(
  'funding_schemes',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    provider: text('provider'),
    /** The scheme's own page. Required before `status` may leave `unverified`. */
    sourceUrl: text('source_url'),
    eligibilitySummary: text('eligibility_summary'),
    /** ISO date of the next deadline, as researched. Meaningless without `verifiedAt`. */
    deadlineAt: text('deadline_at'),
    deadlineRule: text('deadline_rule'),
    /** When a person last checked this against the source. */
    verifiedAt: text('verified_at'),
    /** `unverified | verified | passed | closed` */
    status: text('status').notNull().default('unverified'),
    /** How often the scheme opens, e.g. "Løpende" or "Årlig via kommunen". */
    cycle: text('cycle'),
    /**
     * Free text, deliberately. The source says things like "Normalt ca. 30 %"
     * and "Vanligvis inntil 15 000 kr" — neither is a number, and parsing them
     * into one would turn a hedge into a promise.
     */
    supportRate: text('support_rate'),
    /** What the applicant must put in, in the scheme's own words. */
    matchRule: text('match_rule'),
    /** A human urgency note carried over from the archive, such as "HASTER". */
    priorityNote: text('priority_note'),
    templateKey: text('template_key'),
    /** Where this row came from, e.g. `legacy_mvp_2026_09_08`. Null when typed in. */
    provenance: text('provenance'),
    /** Stable key from the source, so re-importing updates instead of duplicating. */
    legacyId: text('legacy_id'),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    visibility: visibility(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    index('funding_schemes_status').on(table.status),
    index('funding_schemes_deadline').on(table.deadlineAt),
    uniqueIndex('funding_schemes_legacy').on(table.legacyId),
  ],
);

/** The idea bank. Classification follows PLATFORM-SPEC.md section 6. */
export const fundingAngles = sqliteTable(
  'funding_angles',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    /** `core | strong | context | weak | ineligible | needs_verification` */
    strength: text('strength').notNull().default('needs_verification'),
    /** What is still missing before this can be used in an application. */
    missing: text('missing'),
    sourceUrl: text('source_url'),
    verifiedAt: text('verified_at'),
    /** Comma-separated keywords from the source. Not a taxonomy, just hints. */
    tags: text('tags'),
    provenance: text('provenance'),
    legacyId: text('legacy_id'),
    position: integer('position').notNull().default(0),
    visibility: visibility(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    index('funding_angles_strength').on(table.strength),
    uniqueIndex('funding_angles_legacy').on(table.legacyId),
  ],
);

/** An angle may argue for several projects; a project may be argued many ways. */
export const fundingAngleProjects = sqliteTable(
  'funding_angle_projects',
  {
    angleId: text('angle_id')
      .notNull()
      .references(() => fundingAngles.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.angleId, table.projectId] })],
);

/**
 * What a funder asks you to hand in.
 *
 * `source` records how we know about a requirement. `catalogued` means the
 * archive described it; `referenced` means a scheme demanded it but the archive
 * never described it, so `description` is null and stays null. Inventing the
 * missing text would turn a gap in the source into a claim about a funder.
 */
export const documentRequirements = sqliteTable(
  'document_requirements',
  {
    id: text('id').primaryKey(),
    legacyId: text('legacy_id'),
    name: text('name').notNull(),
    description: text('description'),
    /** `catalogued | referenced | local` */
    source: text('source').notNull().default('local'),
    provenance: text('provenance'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [uniqueIndex('document_requirements_legacy').on(table.legacyId)],
);

/** Which schemes a given angle argues for. */
export const fundingSchemeAngles = sqliteTable(
  'funding_scheme_angles',
  {
    schemeId: text('scheme_id')
      .notNull()
      .references(() => fundingSchemes.id, { onDelete: 'cascade' }),
    angleId: text('angle_id')
      .notNull()
      .references(() => fundingAngles.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.schemeId, table.angleId] })],
);

/** What a scheme requires. `obtained` is the farm's own progress, never imported. */
export const fundingSchemeDocuments = sqliteTable(
  'funding_scheme_documents',
  {
    schemeId: text('scheme_id')
      .notNull()
      .references(() => fundingSchemes.id, { onDelete: 'cascade' }),
    documentId: text('document_id')
      .notNull()
      .references(() => documentRequirements.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.schemeId, table.documentId] })],
);

/**
 * Application boilerplate, imported verbatim.
 *
 * `sections` is a JSON object of named paragraphs. Placeholders such as
 * `[GÅRDSNAVN]` are kept exactly as written: filling them in is the applicant's
 * job, and a template that silently guessed would be signed without being read.
 */
export const applicationTemplates = sqliteTable(
  'application_templates',
  {
    id: text('id').primaryKey(),
    legacyId: text('legacy_id'),
    title: text('title').notNull(),
    /** JSON: { summary, need, method, impact }. */
    sections: text('sections').notNull(),
    provenance: text('provenance'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [uniqueIndex('application_templates_legacy').on(table.legacyId)],
);

/** Festival, dugnad weekends and gatherings. Public sign-up still lives in `rsvps`. */
export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    /** Matches `rsvps.camp` while the public preview sign-up is still separate. */
    rsvpKey: text('rsvp_key'),
    startsAt: text('starts_at'),
    endsAt: text('ends_at'),
    capacity: integer('capacity'),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    placeId: text('place_id').references(() => places.id, { onDelete: 'set null' }),
    visibility: visibility(),
    /** `draft | review | published | archived` */
    publicationStatus: text('publication_status').notNull().default('draft'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [uniqueIndex('events_slug').on(table.slug), index('events_starts').on(table.startsAt)],
);

/**
 * Association members. Deliberately empty until authentication exists —
 * CLAUDE.md rule 5 keeps the role field ready, and no real personal data may be
 * entered before there is authorization to protect it.
 */
export const members = sqliteTable(
  'members',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    /** `admin | member | volunteer` */
    role: text('role').notNull().default('member'),
    /** `active | invited | inactive` */
    status: text('status').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [index('members_role').on(table.role)],
);

/** Proposals the association votes on, and the decisions they become. */
export const proposals = sqliteTable(
  'proposals',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body'),
    /** `draft | open | decided | withdrawn` */
    status: text('status').notNull().default('draft'),
    createdBy: text('created_by').references(() => members.id, { onDelete: 'set null' }),
    closesAt: text('closes_at'),
    decidedAt: text('decided_at'),
    outcome: text('outcome'),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    visibility: visibility(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [index('proposals_status').on(table.status)],
);

/**
 * Comments on a work item. Separate from `activity_log`: a comment is something
 * a person chose to write, an activity entry is something the system observed.
 * Deletes are soft so a thread keeps its shape.
 */
export const workItemComments = sqliteTable(
  'work_item_comments',
  {
    id: text('id').primaryKey(),
    workItemId: text('work_item_id')
      .notNull()
      .references(() => workItems.id, { onDelete: 'cascade' }),
    /** Null until authentication exists; `authorName` carries it meanwhile. */
    authorUserId: text('author_user_id'),
    authorName: text('author_name'),
    body: text('body').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: text('deleted_at'),
  },
  table => [index('comments_work_item').on(table.workItemId, table.createdAt)],
);

/** Labels use design tokens rather than free hex, so they stay inside the palette. */
export const labels = sqliteTable(
  'labels',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** A token name such as `accent` or `warn`, resolved in CSS. */
    colorToken: text('color_token'),
    createdAt: createdAt(),
  },
  table => [uniqueIndex('labels_name').on(table.name)],
);

export const workItemLabels = sqliteTable(
  'work_item_labels',
  {
    workItemId: text('work_item_id')
      .notNull()
      .references(() => workItems.id, { onDelete: 'cascade' }),
    labelId: text('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.workItemId, table.labelId] })],
);

/** A named list of things to buy, owned by a project and optionally by a task. */
export const shoppingLists = sqliteTable(
  'shopping_lists',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    workItemId: text('work_item_id').references(() => workItems.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    /** `open | ordered | complete | cancelled` */
    status: text('status').notNull().default('open'),
    createdBy: text('created_by'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [index('shopping_lists_project').on(table.projectId)],
);

/**
 * One product on a list.
 *
 * Money is stored as whole øre in integers. Floating point cannot represent
 * 289.90 exactly, and a budget that drifts by rounding is worse than no budget,
 * so nothing here is ever a float. Quantity is scaled by 1000 for the same
 * reason: 2.5 sacks is stored as 2500.
 */
export const shoppingItems = sqliteTable(
  'shopping_items',
  {
    id: text('id').primaryKey(),
    shoppingListId: text('shopping_list_id')
      .notNull()
      .references(() => shoppingLists.id, { onDelete: 'cascade' }),
    /** Optional link to a budget line, so a cost is not counted twice. */
    budgetLineId: text('budget_line_id'),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    /** Quantity × 1000. 8 sacks is 8000; 2.5 metres is 2500. */
    quantityMilli: integer('quantity_milli').notNull().default(1000),
    unit: text('unit').notNull().default('stk'),
    estimatedUnitPriceOre: integer('estimated_unit_price_ore'),
    actualUnitPriceOre: integer('actual_unit_price_ore'),
    supplier: text('supplier'),
    productUrl: text('product_url'),
    /** `planned | needs_decision | ready | purchased | cancelled` */
    status: text('status').notNull().default('planned'),
    purchasedAt: text('purchased_at'),
    purchasedBy: text('purchased_by'),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    index('shopping_items_list').on(table.shoppingListId, table.position),
    index('shopping_items_status').on(table.status),
  ],
);

/**
 * Photographs and drawings belonging to a project.
 *
 * Two kinds, because they do two different jobs:
 *
 * - `current` is evidence. It is what the place looks like now, and it is a
 *   document requirement in its own right — `Fotodokumentasjon` is asked for by
 *   7 of the 16 imported funding schemes. It accumulates, it is dated, and it
 *   is rarely browsed for pleasure.
 * - `mockup` is the pitch. It is what the place is meant to become, it is what
 *   the project should look like when you open it, and it is what a reviewer or
 *   a donor is shown. There is usually one that matters most.
 *
 * The bytes live in R2 under `storageKey`; only the metadata is here. A row
 * whose object has gone missing is a broken thumbnail, not a broken page.
 */
export const projectImages = sqliteTable(
  'project_images',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** `current | mockup` */
    kind: text('kind').notNull().default('current'),
    /** Key of the object in the media bucket. Never a public URL. */
    storageKey: text('storage_key').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    caption: text('caption'),
    /** When the photo was taken, if known. Not the upload time. */
    takenAt: text('taken_at'),
    /**
     * The one image that represents the project. At most one per project is
     * enforced in the service, not here: SQLite cannot express "one true row
     * per group" without a partial index this schema does not otherwise use.
     */
    isFeatured: integer('is_featured').notNull().default(0),
    /** Optional link to the document requirement this photo helps satisfy. */
    documentRequirementId: text('document_requirement_id'),
    position: integer('position').notNull().default(0),
    uploadedBy: text('uploaded_by'),
    visibility: visibility(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    index('project_images_project').on(table.projectId, table.kind, table.position),
    uniqueIndex('project_images_key').on(table.storageKey),
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
export type FundingScheme = typeof fundingSchemes.$inferSelect;
export type FundingAngle = typeof fundingAngles.$inferSelect;
export type RisenEvent = typeof events.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type WorkItemComment = typeof workItemComments.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type DocumentRequirement = typeof documentRequirements.$inferSelect;
export type ApplicationTemplate = typeof applicationTemplates.$inferSelect;
export type ProjectImage = typeof projectImages.$inferSelect;
