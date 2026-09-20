CREATE TABLE `activity_log` (
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
--> statement-breakpoint
CREATE INDEX `activity_entity` ON `activity_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `activity_created` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `milestones` (
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
--> statement-breakpoint
CREATE INDEX `milestones_project` ON `milestones` (`project_id`,`position`);--> statement-breakpoint
CREATE TABLE `places` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `places_slug` ON `places` (`slug`);--> statement-breakpoint
CREATE TABLE `projects` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `projects_status` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_place` ON `projects` (`place_id`);--> statement-breakpoint
CREATE TABLE `work_items` (
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
--> statement-breakpoint
CREATE INDEX `work_items_project` ON `work_items` (`project_id`);--> statement-breakpoint
CREATE INDEX `work_items_status` ON `work_items` (`status`,`priority`);--> statement-breakpoint
CREATE INDEX `work_items_place` ON `work_items` (`place_id`);