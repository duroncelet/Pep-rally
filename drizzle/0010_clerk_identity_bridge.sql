CREATE TABLE `user_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_user_id` text,
	`legacy_user_id` text,
	`email` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_identities_clerk_user_id_unique` ON `user_identities` (`clerk_user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_identities_legacy_user_id_unique` ON `user_identities` (`legacy_user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_identities_email_unique` ON `user_identities` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_user_identities_email` ON `user_identities` (`email`);
