CREATE TABLE `garden_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `garden_plans_owner_user_id_unique` ON `garden_plans` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `idx_garden_plans_owner` ON `garden_plans` (`owner_user_id`);