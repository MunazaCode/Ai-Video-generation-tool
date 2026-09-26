CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`age` text,
	`appearance` text DEFAULT '' NOT NULL,
	`clothing` text DEFAULT '' NOT NULL,
	`hairstyle` text DEFAULT '' NOT NULL,
	`skin_description` text DEFAULT '' NOT NULL,
	`personality` text DEFAULT '' NOT NULL,
	`visual_identity` text DEFAULT '' NOT NULL,
	`reference_image_path` text,
	`negative_prompt` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`scene_id` text,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`current_step` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error_json` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`visual_identity` text DEFAULT '' NOT NULL,
	`lighting` text DEFAULT '' NOT NULL,
	`architecture` text DEFAULT '' NOT NULL,
	`environment` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`script` text DEFAULT '' NOT NULL,
	`target_duration_sec` integer NOT NULL,
	`actual_duration_sec` integer,
	`aspect_ratio` text NOT NULL,
	`visual_style` text NOT NULL,
	`custom_visual_style` text,
	`language` text NOT NULL,
	`voice_settings_json` text NOT NULL,
	`subtitle_settings_json` text NOT NULL,
	`music_settings_json` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`title` text NOT NULL,
	`narration` text DEFAULT '' NOT NULL,
	`visual_description` text DEFAULT '' NOT NULL,
	`image_prompt` text DEFAULT '' NOT NULL,
	`video_prompt` text DEFAULT '' NOT NULL,
	`duration_sec` integer NOT NULL,
	`character_ids_json` text DEFAULT '[]' NOT NULL,
	`location_id` text,
	`mood` text DEFAULT '' NOT NULL,
	`camera` text DEFAULT '' NOT NULL,
	`lighting` text DEFAULT '' NOT NULL,
	`style` text,
	`previous_scene_context` text,
	`next_scene_context` text,
	`image_status` text NOT NULL,
	`video_status` text NOT NULL,
	`audio_status` text NOT NULL,
	`asset_paths_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenes_project_sequence_idx` ON `scenes` (`project_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `schema_meta` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
