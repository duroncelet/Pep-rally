CREATE TABLE `rally_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`tool_slug` text NOT NULL,
	`reviewer_user_id` text NOT NULL,
	`reviewer_name` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rally_reviews_tool_reviewer` ON `rally_reviews` (`tool_slug`,`reviewer_user_id`);--> statement-breakpoint
CREATE INDEX `idx_rally_reviews_tool_updated` ON `rally_reviews` (`tool_slug`,`updated_at`);