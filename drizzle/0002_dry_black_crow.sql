CREATE TABLE `chart_pattern_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`patternName` text NOT NULL,
	`patternNameKr` text NOT NULL,
	`direction` text NOT NULL,
	`confidence` integer NOT NULL,
	`description` text NOT NULL,
	`priceTarget` text,
	`keyPoints` text,
	`analyzedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chart_pattern_cache_ticker_idx` ON `chart_pattern_cache` (`ticker`);