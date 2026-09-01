ALTER TABLE `purchases` ADD `stripe_session_id` text;--> statement-breakpoint
ALTER TABLE `purchases` ADD `fulfilled_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_purchases_stripe_session` ON `purchases` (`stripe_session_id`);