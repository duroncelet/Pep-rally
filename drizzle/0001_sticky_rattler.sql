CREATE TABLE `creator_apps` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_user_id` text NOT NULL,
	`creator_email` text NOT NULL,
	`name` text NOT NULL,
	`problem` text NOT NULL,
	`outcome` text NOT NULL,
	`proof` text NOT NULL,
	`access_model` text NOT NULL,
	`price_cents` integer NOT NULL,
	`stage` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_creator_apps_owner_updated` ON `creator_apps` (`creator_user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_user_id` text NOT NULL,
	`tool_slug` text NOT NULL,
	`title` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`platform_fee_cents` integer NOT NULL,
	`creator_earnings_cents` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_purchases_buyer_created` ON `purchases` (`buyer_user_id`,`created_at`);