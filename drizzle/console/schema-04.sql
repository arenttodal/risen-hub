CREATE TABLE IF NOT EXISTS `application_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`legacy_id` text,
	`title` text NOT NULL,
	`sections` text NOT NULL,
	`provenance` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `application_templates_legacy` ON `application_templates` (`legacy_id`);
CREATE TABLE IF NOT EXISTS `document_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`legacy_id` text,
	`name` text NOT NULL,
	`description` text,
	`source` text DEFAULT 'local' NOT NULL,
	`provenance` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `document_requirements_legacy` ON `document_requirements` (`legacy_id`);
CREATE TABLE IF NOT EXISTS `funding_scheme_angles` (
	`scheme_id` text NOT NULL,
	`angle_id` text NOT NULL,
	PRIMARY KEY(`scheme_id`, `angle_id`),
	FOREIGN KEY (`scheme_id`) REFERENCES `funding_schemes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`angle_id`) REFERENCES `funding_angles`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS `funding_scheme_documents` (
	`scheme_id` text NOT NULL,
	`document_id` text NOT NULL,
	PRIMARY KEY(`scheme_id`, `document_id`),
	FOREIGN KEY (`scheme_id`) REFERENCES `funding_schemes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `document_requirements`(`id`) ON UPDATE no action ON DELETE cascade
);
ALTER TABLE `funding_angles` ADD `tags` text;
ALTER TABLE `funding_angles` ADD `provenance` text;
ALTER TABLE `funding_angles` ADD `legacy_id` text;
ALTER TABLE `funding_angles` ADD `position` integer DEFAULT 0 NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `funding_angles_legacy` ON `funding_angles` (`legacy_id`);
ALTER TABLE `funding_schemes` ADD `cycle` text;
ALTER TABLE `funding_schemes` ADD `support_rate` text;
ALTER TABLE `funding_schemes` ADD `match_rule` text;
ALTER TABLE `funding_schemes` ADD `priority_note` text;
ALTER TABLE `funding_schemes` ADD `template_key` text;
ALTER TABLE `funding_schemes` ADD `provenance` text;
ALTER TABLE `funding_schemes` ADD `legacy_id` text;
CREATE UNIQUE INDEX IF NOT EXISTS `funding_schemes_legacy` ON `funding_schemes` (`legacy_id`);
