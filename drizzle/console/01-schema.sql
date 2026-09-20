CREATE TABLE IF NOT EXISTS `rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`camp` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `camp_email` ON `rsvps` (`camp`,`email`);
CREATE TABLE IF NOT EXISTS `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`summary` text NOT NULL,
	`actor_id` text,
	`actor_name` text,
	`actor_role` text DEFAULT 'system' NOT NULL,
	`metadata` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `activity_entity` ON `activity_log` (`entity_type`,`entity_id`);
CREATE INDEX IF NOT EXISTS `activity_created` ON `activity_log` (`created_at`);
CREATE TABLE IF NOT EXISTS `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`due_date` text,
	`completed_at` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `milestones_project` ON `milestones` (`project_id`,`position`);
CREATE TABLE IF NOT EXISTS `places` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'building' NOT NULL,
	`summary` text,
	`condition` text DEFAULT 'unknown' NOT NULL,
	`condition_assessed_at` text,
	`condition_source_url` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `places_slug` ON `places` (`slug`);
CREATE TABLE IF NOT EXISTS `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`summary` text,
	`category` text DEFAULT 'Ukategorisert' NOT NULL,
	`status` text DEFAULT 'planning' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`budget_nok` integer DEFAULT 0 NOT NULL,
	`funded_nok` integer DEFAULT 0 NOT NULL,
	`next_action` text,
	`place_id` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX IF NOT EXISTS `projects_slug` ON `projects` (`slug`);
CREATE INDEX IF NOT EXISTS `projects_status` ON `projects` (`status`);
CREATE INDEX IF NOT EXISTS `projects_place` ON `projects` (`place_id`);
CREATE TABLE IF NOT EXISTS `work_items` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`place_id` text,
	`milestone_id` text,
	`title` text NOT NULL,
	`detail` text,
	`type` text DEFAULT 'task' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'inbox' NOT NULL,
	`assignee` text,
	`estimated_hours` integer,
	`due_date` text,
	`completed_at` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS `work_items_project` ON `work_items` (`project_id`);
CREATE INDEX IF NOT EXISTS `work_items_status` ON `work_items` (`status`,`priority`);
CREATE INDEX IF NOT EXISTS `work_items_place` ON `work_items` (`place_id`);
CREATE TABLE IF NOT EXISTS `events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`rsvp_key` text,
	`starts_at` text,
	`ends_at` text,
	`capacity` integer,
	`project_id` text,
	`place_id` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX IF NOT EXISTS `events_slug` ON `events` (`slug`);
CREATE INDEX IF NOT EXISTS `events_starts` ON `events` (`starts_at`);
CREATE TABLE IF NOT EXISTS `funding_angle_projects` (
	`angle_id` text NOT NULL,
	`project_id` text NOT NULL,
	PRIMARY KEY(`angle_id`, `project_id`),
	FOREIGN KEY (`angle_id`) REFERENCES `funding_angles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS `funding_angles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`strength` text DEFAULT 'needs_verification' NOT NULL,
	`missing` text,
	`source_url` text,
	`verified_at` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `funding_angles_strength` ON `funding_angles` (`strength`);
CREATE TABLE IF NOT EXISTS `funding_schemes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text,
	`source_url` text,
	`eligibility_summary` text,
	`deadline_at` text,
	`deadline_rule` text,
	`verified_at` text,
	`status` text DEFAULT 'unverified' NOT NULL,
	`project_id` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS `funding_schemes_status` ON `funding_schemes` (`status`);
CREATE INDEX IF NOT EXISTS `funding_schemes_deadline` ON `funding_schemes` (`deadline_at`);
CREATE TABLE IF NOT EXISTS `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `members_role` ON `members` (`role`);
CREATE TABLE IF NOT EXISTS `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text,
	`closes_at` text,
	`decided_at` text,
	`outcome` text,
	`project_id` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS `proposals_status` ON `proposals` (`status`);
