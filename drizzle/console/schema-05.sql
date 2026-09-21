CREATE TABLE IF NOT EXISTS `project_images` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text DEFAULT 'current' NOT NULL,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`caption` text,
	`taken_at` text,
	`is_featured` integer DEFAULT 0 NOT NULL,
	`document_requirement_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`uploaded_by` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `project_images_project` ON `project_images` (`project_id`,`kind`,`position`);
CREATE UNIQUE INDEX IF NOT EXISTS `project_images_key` ON `project_images` (`storage_key`);
