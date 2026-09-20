CREATE TABLE `party_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `party_plans_owner_user_id_unique` ON `party_plans` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `idx_party_plans_owner` ON `party_plans` (`owner_user_id`);