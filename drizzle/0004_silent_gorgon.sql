CREATE TABLE `stock_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`content` text NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_notes_user_ticker_idx` ON `stock_notes` (`userId`,`ticker`);--> statement-breakpoint
ALTER TABLE `portfolio_positions` ADD `entrySignalScore` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `cashBalance` real DEFAULT 100000 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `krwBalance` real DEFAULT 30000000 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `realizedPnl` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `realizedPnlKrw` real DEFAULT 0 NOT NULL;