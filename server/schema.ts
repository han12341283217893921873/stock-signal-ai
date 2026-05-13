import {
  integer,
  text,
  real,
  sqliteTable,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] })
    .default("user")
    .notNull(),
  // ?뱁썒/?대찓???뚮┝ 梨꾨꼸 ?ㅼ젙
  notifyEmail: text("notifyEmail"),
  notifyWebhook: text("notifyWebhook"),
  autopilotEnabled: integer("autopilotEnabled").default(0).notNull(),
  cashBalance: real("cashBalance").default(100000).notNull(), // ?쒖옉 ?먮낯湲?$100,000
  krwBalance: real("krwBalance").default(30000000).notNull(), // ?쒖옉 ?먮낯湲???0,000,000
  realizedPnl: real("realizedPnl").default(0).notNull(), // USD ?ㅽ쁽 ?먯씡
  realizedPnlKrw: real("realizedPnlKrw").default(0).notNull(), // KRW ?ㅽ쁽 ?먯씡
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const watchlist = sqliteTable(
  "watchlist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    name: text("name"),
    tag: text("tag"),
    addedAt: integer("addedAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    userIdIdx: index("watchlist_userId_idx").on(table.userId),
    tickerIdx: index("watchlist_ticker_idx").on(table.ticker),
  })
);

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

export const signalHistory = sqliteTable(
  "signal_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    signalType: text("signalType", {
      enum: ["buy", "sell", "neutral", "hold"],
    }).notNull(),
    strength: integer("strength"),
    price: real("price"),
    rsi: real("rsi"),
    macdSignal: text("macdSignal"),
    reason: text("reason"),
    aiComment: text("aiComment"),
    isRead: integer("isRead").default(0).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    userIdIdx: index("signal_history_userId_idx").on(table.userId),
    tickerIdx: index("signal_history_ticker_idx").on(table.ticker),
  })
);

export type SignalHistory = typeof signalHistory.$inferSelect;
export type InsertSignalHistory = typeof signalHistory.$inferInsert;

export const portfolioPositions = sqliteTable(
  "portfolio_positions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    name: text("name"),
    quantity: real("quantity").notNull(),
    avgPrice: real("avgPrice").notNull(),
    memo: text("memo"),
    entrySignalScore: integer("entrySignalScore"), // 吏꾩엯 ?쒖젏 AI ?먯닔
    addedAt: integer("addedAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    userIdIdx: index("portfolio_positions_userId_idx").on(table.userId),
    tickerIdx: index("portfolio_positions_ticker_idx").on(table.ticker),
  })
);

export type PortfolioPosition = typeof portfolioPositions.$inferSelect;
export type InsertPortfolioPosition = typeof portfolioPositions.$inferInsert;

export const alertConditions = sqliteTable(
  "alert_conditions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    name: text("name"),
    conditionType: text("conditionType", {
      enum: [
        "rsi_below",
        "rsi_above",
        "signal_strength_above",
        "price_above",
        "price_below",
        "complex",
      ],
    }).notNull(),
    threshold: real("threshold").notNull(),
    macroConditionType: text("macroConditionType", {
      enum: ["vix_above", "vix_below", "fear_greed_above", "fear_greed_below"],
    }),
    macroThreshold: real("macroThreshold"),
    conditionJson: text("conditionJson"),
    isActive: integer("isActive").default(1).notNull(),
    lastTriggeredAt: integer("lastTriggeredAt", { mode: "timestamp" }),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    userIdIdx: index("alert_conditions_userId_idx").on(table.userId),
    tickerIdx: index("alert_conditions_ticker_idx").on(table.ticker),
  })
);

export type AlertCondition = typeof alertConditions.$inferSelect;
export type InsertAlertCondition = typeof alertConditions.$inferInsert;

// scanHistory: market enum??"all" 異붽?
export const scanHistory = sqliteTable("scan_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  market: text("market", { enum: ["us", "kr", "all"] }).notNull(),
  scannedAt: integer("scannedAt", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
  totalScanned: integer("totalScanned").default(0).notNull(),
  topBuys: text("topBuys"),
  topSells: text("topSells"),
  results: text("results"),
});

export type ScanHistory = typeof scanHistory.$inferSelect;
export type InsertScanHistory = typeof scanHistory.$inferInsert;

export const tradeLogs = sqliteTable(
  "trade_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    type: text("type", { enum: ["buy", "sell", "memo"] }).notNull(),
    date: integer("date", { mode: "timestamp" }).notNull(),
    price: real("price"),
    targetPrice: real("targetPrice"),
    stopPrice: real("stopPrice"),
    content: text("content"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    userIdIdx: index("trade_logs_userId_idx").on(table.userId),
    tickerIdx: index("trade_logs_ticker_idx").on(table.ticker),
  })
);

export type TradeLog = typeof tradeLogs.$inferSelect;
export type InsertTradeLog = typeof tradeLogs.$inferInsert;

export const signalPerformance = sqliteTable(
  "signal_performance",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ticker: text("ticker").notNull(),
    signalType: text("signalType", {
      enum: ["buy", "sell", "neutral", "hold"],
    }).notNull(),
    strength: integer("strength").notNull(),
    entryPrice: real("entryPrice").notNull(),
    exitPrice: real("exitPrice"),
    profitLoss: real("profitLoss"),
    profitLossPercent: real("profitLossPercent"),
    daysHeld: integer("daysHeld"),
    status: text("status", { enum: ["pending", "closed", "cancelled"] })
      .default("pending")
      .notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    closedAt: integer("closedAt", { mode: "timestamp" }),
  },
  table => ({
    tickerIdx: index("signal_performance_ticker_idx").on(table.ticker),
    statusIdx: index("signal_performance_status_idx").on(table.status),
  })
);

export type SignalPerformance = typeof signalPerformance.$inferSelect;
export type InsertSignalPerformance = typeof signalPerformance.$inferInsert;

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["free", "premium", "pro"] })
    .default("free")
    .notNull(),
  status: text("status", { enum: ["active", "cancelled", "expired"] })
    .default("active")
    .notNull(),
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  currentPeriodStart: integer("currentPeriodStart", { mode: "timestamp" }),
  currentPeriodEnd: integer("currentPeriodEnd", { mode: "timestamp" }),
  cancelledAt: integer("cancelledAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const portfolioSnapshots = sqliteTable(
  "portfolio_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalValue: real("totalValue").notNull(),
    totalInvested: real("totalInvested").notNull(),
    pnlPercent: real("pnlPercent").notNull(),
    snapshotDate: text("snapshotDate").notNull(), // YYYY-MM-DD
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    userIdIdx: index("portfolio_snapshots_userId_idx").on(table.userId),
    snapshotDateIdx: index("portfolio_snapshots_date_idx").on(
      table.snapshotDate
    ),
  })
);

export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type InsertPortfolioSnapshot = typeof portfolioSnapshots.$inferInsert;

export const alertHistory = sqliteTable(
  "alert_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    alertConditionId: integer("alertConditionId")
      .notNull()
      .references(() => alertConditions.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    conditionType: text("conditionType").notNull(),
    message: text("message"),
    triggeredAt: integer("triggeredAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    userIdIdx: index("alert_history_userId_idx").on(table.userId),
    alertConditionIdIdx: index("alert_history_alertConditionId_idx").on(
      table.alertConditionId
    ),
  })
);

export type AlertHistory = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;

export const newsSummaries = sqliteTable(
  "news_summaries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ticker: text("ticker").notNull(),
    summary: text("summary").notNull(),
    score: real("score").notNull(),
    label: text("label").notNull(),
    keyFactors: text("keyFactors"), // JSON string
    headlines: text("headlines"), // JSON string
    analyzedAt: integer("analyzedAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    tickerIdx: index("news_summaries_ticker_idx").on(table.ticker),
  })
);

export type NewsSummary = typeof newsSummaries.$inferSelect;
export type InsertNewsSummary = typeof newsSummaries.$inferInsert;

export const chartPatternCache = sqliteTable(
  "chart_pattern_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ticker: text("ticker").notNull(),
    patternName: text("patternName").notNull(),
    patternNameKr: text("patternNameKr").notNull(),
    direction: text("direction").notNull(),
    confidence: integer("confidence").notNull(),
    description: text("description").notNull(),
    priceTarget: text("priceTarget"),
    keyPoints: text("keyPoints"), // JSON string
    analyzedAt: integer("analyzedAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    tickerIdx: index("chart_pattern_cache_ticker_idx").on(table.ticker),
  })
);

export type ChartPatternCache = typeof chartPatternCache.$inferSelect;
export type InsertChartPatternCache = typeof chartPatternCache.$inferInsert;

export const stockNotes = sqliteTable(
  "stock_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    content: text("content").notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  table => ({
    userTickerIdx: uniqueIndex("stock_notes_user_ticker_idx").on(
      table.userId,
      table.ticker
    ),
  })
);

export type StockNote = typeof stockNotes.$inferSelect;
export type InsertStockNote = typeof stockNotes.$inferInsert;
