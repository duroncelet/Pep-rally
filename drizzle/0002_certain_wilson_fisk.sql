ALTER TABLE `creator_apps` ADD `source_type` text DEFAULT 'guided' NOT NULL;--> statement-breakpoint
ALTER TABLE `creator_apps` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `creator_apps` ADD `source_file_key` text;--> statement-breakpoint
ALTER TABLE `creator_apps` ADD `builder_spec` text;