CREATE TABLE `alert_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`alertConditionId` integer NOT NULL,
	`ticker` text NOT NULL,
	`conditionType` text NOT NULL,
	`message` text,
	`triggeredAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`alertConditionId`) REFERENCES `alert_conditions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `alert_history_userId_idx` ON `alert_history` (`userId`);--> statement-breakpoint
CREATE INDEX `alert_history_alertConditionId_idx` ON `alert_history` (`alertConditionId`);--> statement-breakpoint
CREATE TABLE `news_summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`summary` text NOT NULL,
	`score` real NOT NULL,
	`label` text NOT NULL,
	`keyFactors` text,
	`headlines` text,
	`analyzedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `news_summaries_ticker_idx` ON `news_summaries` (`ticker`);--> statement-breakpoint
CREATE TABLE `portfolio_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`totalValue` real NOT NULL,
	`totalInvested` real NOT NULL,
	`pnlPercent` real NOT NULL,
	`snapshotDate` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portfolio_snapshots_userId_idx` ON `portfolio_snapshots` (`userId`);--> statement-breakpoint
CREATE INDEX `portfolio_snapshots_date_idx` ON `portfolio_snapshots` (`snapshotDate`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_trade_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`type` text NOT NULL,
	`date` integer NOT NULL,
	`price` real,
	`targetPrice` real,
	`stopPrice` real,
	`content` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_trade_logs`("id", "userId", "ticker", "type", "date", "price", "targetPrice", "stopPrice", "content", "createdAt") SELECT "id", "userId", "ticker", "type", "date", "price", "targetPrice", "stopPrice", "content", "createdAt" FROM `trade_logs`;--> statement-breakpoint
DROP TABLE `trade_logs`;--> statement-breakpoint
ALTER TABLE `__new_trade_logs` RENAME TO `trade_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `trade_logs_userId_idx` ON `trade_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `trade_logs_ticker_idx` ON `trade_logs` (`ticker`);--> statement-breakpoint
ALTER TABLE `users` ADD `notifyEmail` text;--> statement-breakpoint
ALTER TABLE `users` ADD `notifyWebhook` text;--> statement-breakpoint
CREATE TABLE `__new_watchlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`name` text,
	`tag` text,
	`addedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_watchlist`("id", "userId", "ticker", "name", "tag", "addedAt") SELECT "id", "userId", "ticker", "name", "tag", "addedAt" FROM `watchlist`;--> statement-breakpoint
DROP TABLE `watchlist`;--> statement-breakpoint
ALTER TABLE `__new_watchlist` RENAME TO `watchlist`;--> statement-breakpoint
CREATE INDEX `watchlist_userId_idx` ON `watchlist` (`userId`);--> statement-breakpoint
CREATE INDEX `watchlist_ticker_idx` ON `watchlist` (`ticker`);--> statement-breakpoint
CREATE TABLE `__new_alert_conditions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`name` text,
	`conditionType` text NOT NULL,
	`threshold` real NOT NULL,
	`conditionJson` text,
	`isActive` integer DEFAULT 1 NOT NULL,
	`lastTriggeredAt` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_alert_conditions`("id", "userId", "ticker", "name", "conditionType", "threshold", "conditionJson", "isActive", "lastTriggeredAt", "createdAt") SELECT "id", "userId", "ticker", "name", "conditionType", "threshold", "conditionJson", "isActive", "lastTriggeredAt", "createdAt" FROM `alert_conditions`;--> statement-breakpoint
DROP TABLE `alert_conditions`;--> statement-breakpoint
ALTER TABLE `__new_alert_conditions` RENAME TO `alert_conditions`;--> statement-breakpoint
CREATE INDEX `alert_conditions_userId_idx` ON `alert_conditions` (`userId`);--> statement-breakpoint
CREATE INDEX `alert_conditions_ticker_idx` ON `alert_conditions` (`ticker`);--> statement-breakpoint
CREATE TABLE `__new_portfolio_positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`name` text,
	`quantity` real NOT NULL,
	`avgPrice` real NOT NULL,
	`memo` text,
	`addedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_portfolio_positions`("id", "userId", "ticker", "name", "quantity", "avgPrice", "memo", "addedAt", "updatedAt") SELECT "id", "userId", "ticker", "name", "quantity", "avgPrice", "memo", "addedAt", "updatedAt" FROM `portfolio_positions`;--> statement-breakpoint
DROP TABLE `portfolio_positions`;--> statement-breakpoint
ALTER TABLE `__new_portfolio_positions` RENAME TO `portfolio_positions`;--> statement-breakpoint
CREATE INDEX `portfolio_positions_userId_idx` ON `portfolio_positions` (`userId`);--> statement-breakpoint
CREATE INDEX `portfolio_positions_ticker_idx` ON `portfolio_positions` (`ticker`);--> statement-breakpoint
CREATE TABLE `__new_signal_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`signalType` text NOT NULL,
	`strength` integer,
	`price` real,
	`rsi` real,
	`macdSignal` text,
	`reason` text,
	`aiComment` text,
	`isRead` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_signal_history`("id", "userId", "ticker", "signalType", "strength", "price", "rsi", "macdSignal", "reason", "aiComment", "isRead", "createdAt") SELECT "id", "userId", "ticker", "signalType", "strength", "price", "rsi", "macdSignal", "reason", "aiComment", "isRead", "createdAt" FROM `signal_history`;--> statement-breakpoint
DROP TABLE `signal_history`;--> statement-breakpoint
ALTER TABLE `__new_signal_history` RENAME TO `signal_history`;--> statement-breakpoint
CREATE INDEX `signal_history_userId_idx` ON `signal_history` (`userId`);--> statement-breakpoint
CREATE INDEX `signal_history_ticker_idx` ON `signal_history` (`ticker`);--> statement-breakpoint
CREATE INDEX `signal_performance_ticker_idx` ON `signal_performance` (`ticker`);--> statement-breakpoint
CREATE INDEX `signal_performance_status_idx` ON `signal_performance` (`status`);--> statement-breakpoint
CREATE TABLE `__new_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`stripeCustomerId` text,
	`stripeSubscriptionId` text,
	`currentPeriodStart` integer,
	`currentPeriodEnd` integer,
	`cancelledAt` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_subscriptions`("id", "userId", "plan", "status", "stripeCustomerId", "stripeSubscriptionId", "currentPeriodStart", "currentPeriodEnd", "cancelledAt", "createdAt", "updatedAt") SELECT "id", "userId", "plan", "status", "stripeCustomerId", "stripeSubscriptionId", "currentPeriodStart", "currentPeriodEnd", "cancelledAt", "createdAt", "updatedAt" FROM `subscriptions`;--> statement-breakpoint
DROP TABLE `subscriptions`;--> statement-breakpoint
ALTER TABLE `__new_subscriptions` RENAME TO `subscriptions`;--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_userId_unique` ON `subscriptions` (`userId`);