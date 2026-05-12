CREATE TABLE `alert_conditions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`name` text,
	`conditionType` text NOT NULL,
	`threshold` real NOT NULL,
	`conditionJson` text,
	`isActive` integer DEFAULT 1 NOT NULL,
	`lastTriggeredAt` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portfolio_positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`name` text,
	`quantity` real NOT NULL,
	`avgPrice` real NOT NULL,
	`memo` text,
	`addedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scan_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`market` text NOT NULL,
	`scannedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`totalScanned` integer DEFAULT 0 NOT NULL,
	`topBuys` text,
	`topSells` text
);
--> statement-breakpoint
CREATE TABLE `signal_history` (
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
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signal_performance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`signalType` text NOT NULL,
	`strength` integer NOT NULL,
	`entryPrice` real NOT NULL,
	`exitPrice` real,
	`profitLoss` real,
	`profitLossPercent` real,
	`daysHeld` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`closedAt` integer
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
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
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_userId_unique` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE TABLE `trade_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`type` text NOT NULL,
	`date` integer NOT NULL,
	`price` real,
	`content` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`lastSignedIn` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`ticker` text NOT NULL,
	`name` text,
	`addedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
