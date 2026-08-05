CREATE TABLE `saved_rallies` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tool_slug` text NOT NULL,
	`title` text NOT NULL,
	`inputs` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_saved_rallies_user_updated` ON `saved_rallies` (`user_id`,`updated_at`);