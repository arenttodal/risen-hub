CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color_token` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_name` ON `labels` (`name`);--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`shopping_list_id` text NOT NULL,
	`budget_line_id` text,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`quantity_milli` integer DEFAULT 1000 NOT NULL,
	`unit` text DEFAULT 'stk' NOT NULL,
	`estimated_unit_price_ore` integer,
	`actual_unit_price_ore` integer,
	`supplier` text,
	`product_url` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`purchased_at` text,
	`purchased_by` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shopping_list_id`) REFERENCES `shopping_lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shopping_items_list` ON `shopping_items` (`shopping_list_id`,`position`);--> statement-breakpoint
CREATE INDEX `shopping_items_status` ON `shopping_items` (`status`);--> statement-breakpoint
CREATE TABLE `shopping_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`work_item_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_item_id`) REFERENCES `work_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `shopping_lists_project` ON `shopping_lists` (`project_id`);--> statement-breakpoint
CREATE TABLE `work_item_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`work_item_id` text NOT NULL,
	`author_user_id` text,
	`author_name` text,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`work_item_id`) REFERENCES `work_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_work_item` ON `work_item_comments` (`work_item_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `work_item_labels` (
	`work_item_id` text NOT NULL,
	`label_id` text NOT NULL,
	PRIMARY KEY(`work_item_id`, `label_id`),
	FOREIGN KEY (`work_item_id`) REFERENCES `work_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `work_items` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `work_items` ADD `required_people` integer;--> statement-breakpoint
ALTER TABLE `work_items` ADD `suitable_for_dugnad` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `work_items` ADD `weather_dependency` text;--> statement-breakpoint
ALTER TABLE `work_items` ADD `start_at` text;--> statement-breakpoint
ALTER TABLE `work_items` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `work_items` ADD `created_by` text;--> statement-breakpoint
CREATE INDEX `work_items_parent` ON `work_items` (`parent_id`);--> statement-breakpoint
CREATE INDEX `work_items_assignee` ON `work_items` (`assignee`);--> statement-breakpoint
CREATE INDEX `work_items_due` ON `work_items` (`due_date`);--> statement-breakpoint
-- Data migration, hand-written: Drizzle diffs schema, not values.
-- 1. The status machine gains `planned` and `cancelled`, and `doing` becomes
--    `in_progress` to match the vocabulary used everywhere else.
UPDATE `work_items` SET `status` = 'in_progress' WHERE `status` = 'doing';
--> statement-breakpoint
-- 2. Existing rows get a deterministic manual order instead of all-zero, so
--    drag-to-reorder has something stable to work against.
UPDATE `work_items` SET `position` = rowid WHERE `position` = 0;
