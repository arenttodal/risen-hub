CREATE TABLE IF NOT EXISTS `rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`camp` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `camp_email` ON `rsvps` (`camp`,`email`);
