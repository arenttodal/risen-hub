CREATE TABLE `application_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`legacy_id` text,
	`title` text NOT NULL,
	`sections` text NOT NULL,
	`provenance` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_templates_legacy` ON `application_templates` (`legacy_id`);--> statement-breakpoint
CREATE TABLE `document_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`legacy_id` text,
	`name` text NOT NULL,
	`description` text,
	`source` text DEFAULT 'local' NOT NULL,
	`provenance` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_requirements_legacy` ON `document_requirements` (`legacy_id`);--> statement-breakpoint
CREATE TABLE `funding_scheme_angles` (
	`scheme_id` text NOT NULL,
	`angle_id` text NOT NULL,
	PRIMARY KEY(`scheme_id`, `angle_id`),
	FOREIGN KEY (`scheme_id`) REFERENCES `funding_schemes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`angle_id`) REFERENCES `funding_angles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `funding_scheme_documents` (
	`scheme_id` text NOT NULL,
	`document_id` text NOT NULL,
	PRIMARY KEY(`scheme_id`, `document_id`),
	FOREIGN KEY (`scheme_id`) REFERENCES `funding_schemes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `document_requirements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `funding_angles` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `funding_angles` ADD `provenance` text;--> statement-breakpoint
ALTER TABLE `funding_angles` ADD `legacy_id` text;--> statement-breakpoint
ALTER TABLE `funding_angles` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `funding_angles_legacy` ON `funding_angles` (`legacy_id`);--> statement-breakpoint
ALTER TABLE `funding_schemes` ADD `cycle` text;--> statement-breakpoint
ALTER TABLE `funding_schemes` ADD `support_rate` text;--> statement-breakpoint
ALTER TABLE `funding_schemes` ADD `match_rule` text;--> statement-breakpoint
ALTER TABLE `funding_schemes` ADD `priority_note` text;--> statement-breakpoint
ALTER TABLE `funding_schemes` ADD `template_key` text;--> statement-breakpoint
ALTER TABLE `funding_schemes` ADD `provenance` text;--> statement-breakpoint
ALTER TABLE `funding_schemes` ADD `legacy_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `funding_schemes_legacy` ON `funding_schemes` (`legacy_id`);