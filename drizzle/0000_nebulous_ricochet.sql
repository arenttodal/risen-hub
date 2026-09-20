CREATE TABLE `rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`camp` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `camp_email` ON `rsvps` (`camp`,`email`);