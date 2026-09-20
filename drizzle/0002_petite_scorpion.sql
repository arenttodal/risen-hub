CREATE TABLE `events` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_starts` ON `events` (`starts_at`);--> statement-breakpoint
CREATE TABLE `funding_angle_projects` (
	`angle_id` text NOT NULL,
	`project_id` text NOT NULL,
	PRIMARY KEY(`angle_id`, `project_id`),
	FOREIGN KEY (`angle_id`) REFERENCES `funding_angles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `funding_angles` (
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
--> statement-breakpoint
CREATE INDEX `funding_angles_strength` ON `funding_angles` (`strength`);--> statement-breakpoint
CREATE TABLE `funding_schemes` (
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
--> statement-breakpoint
CREATE INDEX `funding_schemes_status` ON `funding_schemes` (`status`);--> statement-breakpoint
CREATE INDEX `funding_schemes_deadline` ON `funding_schemes` (`deadline_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `members_role` ON `members` (`role`);--> statement-breakpoint
CREATE TABLE `proposals` (
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
--> statement-breakpoint
CREATE INDEX `proposals_status` ON `proposals` (`status`);