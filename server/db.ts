import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { TRPCError } from "@trpc/server";
import {
  User,
  InsertUser,
  users,
  watchlist,
  signalHistory,
  stockNotes,
  newsSummaries,
  chartPatternCache,
} from "./schema.js";
import type {
  InsertWatchlist,
  InsertSignalHistory,
  InsertStockNote,
  InsertNewsSummary,
  InsertChartPatternCache,
} from "./schema.js";
import { ENV } from "./_core/env.js";

// ─── Custom Logger ───────────────────────────────────────────────────────────

/**
 * 타임스탬프와 컨텍스트 정보를 포함한 커스텀 에러 로거
 */
function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${timestamp} [${context}]: ${message}`);
}

function logWarn(context: string, message: string): void {
  const timestamp = new Date().toISOString();
  console.warn(`[WARN] ${timestamp} [${context}]: ${message}`);
}

// ─── Database Connection ──────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof createClient> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = createClient({
        url: ENV.databaseUrl,
        authToken: ENV.databaseAuthToken,
      });
      _db = drizzle(_client);
    } catch (error) {
      logError("Database.getDb", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }
  }
  return _db;
}

export async function upsertUser(
  user: Partial<User> & { openId: string }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    logWarn("Database.upsertUser", "database not available");
    return;
  }

  try {
    const now = new Date();
    const lastSignedIn = user.lastSignedIn ?? now;

    // insert할 값들 (id는 자동생성이므로 제외)
    // role은 명시적으로 전달되지 않으면 기본값 'user' (owner인 경우 'admin')
    const values: any = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      lastSignedIn: lastSignedIn,
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      updatedAt: now,
    };

    // update할 값들
    const updateSet: any = {
      updatedAt: now,
      lastSignedIn: lastSignedIn,
    };

    if (user.name !== undefined) updateSet.name = user.name ?? null;
    if (user.email !== undefined) updateSet.email = user.email ?? null;
    if (user.loginMethod !== undefined)
      updateSet.loginMethod = user.loginMethod ?? null;
    if (user.role !== undefined) updateSet.role = user.role;

    const existingUser = await getUserByOpenId(user.openId);

    if (existingUser) {
      await db
        .update(users)
        .set(updateSet)
        .where(eq(users.openId, user.openId));
    } else {
      await db.insert(users).values(values);
    }
  } catch (error) {
    logError("Database.upsertUser", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to upsert user: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    logWarn("Database.getUserByOpenId", "database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    logError("Database.getUserByOpenId", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get user by openId: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// ─── Watchlist ───────────────────────────────────────────────────────────────

export async function getWatchlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db.select().from(watchlist).where(eq(watchlist.userId, userId));
  } catch (error) {
    logError("Database.getWatchlist", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get watchlist: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function addToWatchlist(data: InsertWatchlist) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    // Check if already exists
    const existing = await db
      .select()
      .from(watchlist)
      .where(
        and(
          eq(watchlist.userId, data.userId),
          eq(watchlist.ticker, data.ticker)
        )
      )
      .limit(1);
    if (existing.length > 0) return existing[0];
    await db.insert(watchlist).values(data);
    const inserted = await db
      .select()
      .from(watchlist)
      .where(
        and(
          eq(watchlist.userId, data.userId),
          eq(watchlist.ticker, data.ticker)
        )
      )
      .limit(1);
    return inserted[0];
  } catch (error) {
    logError("Database.addToWatchlist", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to add to watchlist: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function removeFromWatchlist(userId: number, ticker: string) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db
      .delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.ticker, ticker)));
  } catch (error) {
    logError("Database.removeFromWatchlist", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to remove from watchlist: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// ─── Signal History ──────────────────────────────────────────────────────────

export async function getSignalHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(signalHistory)
      .where(eq(signalHistory.userId, userId))
      .orderBy(desc(signalHistory.createdAt))
      .limit(limit);
  } catch (error) {
    logError("Database.getSignalHistory", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get signal history: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function addSignalHistory(data: InsertSignalHistory) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db.insert(signalHistory).values(data);
  } catch (error) {
    logError("Database.addSignalHistory", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to add signal history: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function markSignalAsRead(userId: number, signalId: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db
      .update(signalHistory)
      .set({ isRead: 1 })
      .where(
        and(eq(signalHistory.id, signalId), eq(signalHistory.userId, userId))
      );
  } catch (error) {
    logError("Database.markSignalAsRead", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to mark signal as read: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function markAllSignalsAsRead(userId: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db
      .update(signalHistory)
      .set({ isRead: 1 })
      .where(
        and(eq(signalHistory.userId, userId), eq(signalHistory.isRead, 0))
      );
  } catch (error) {
    logError("Database.markAllSignalsAsRead", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to mark all signals as read: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getUnreadSignalCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db
      .select()
      .from(signalHistory)
      .where(
        and(eq(signalHistory.userId, userId), eq(signalHistory.isRead, 0))
      );
    return result.length;
  } catch (error) {
    logError("Database.getUnreadSignalCount", error);
    return 0;
  }
}

// ─── Portfolio Positions ─────────────────────────────────────────────────────

import type {
  InsertPortfolioPosition,
  InsertAlertCondition,
  InsertScanHistory,
  InsertTradeLog,
  InsertSignalPerformance,
  InsertPortfolioSnapshot,
  InsertAlertHistory,
} from "./schema.js";
import {
  portfolioPositions,
  alertConditions,
  scanHistory,
  tradeLogs,
  signalPerformance,
  portfolioSnapshots,
  alertHistory,
} from "./schema.js";
import { sql, lt, isNull } from "drizzle-orm";

export async function getPortfolioPositions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(portfolioPositions)
      .where(eq(portfolioPositions.userId, userId))
      .orderBy(desc(portfolioPositions.addedAt));
  } catch (error) {
    logError("Database.getPortfolioPositions", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get portfolio positions: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function addPortfolioPosition(data: InsertPortfolioPosition) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db.insert(portfolioPositions).values(data);
    const inserted = await db
      .select()
      .from(portfolioPositions)
      .where(
        and(
          eq(portfolioPositions.userId, data.userId),
          eq(portfolioPositions.ticker, data.ticker)
        )
      )
      .orderBy(desc(portfolioPositions.addedAt))
      .limit(1);
    return inserted[0];
  } catch (error) {
    logError("Database.addPortfolioPosition", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to add portfolio position: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function updatePortfolioPosition(
  userId: number,
  id: number,
  data: Partial<Pick<InsertPortfolioPosition, "quantity" | "avgPrice" | "memo">>
) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db
      .update(portfolioPositions)
      .set(data)
      .where(
        and(
          eq(portfolioPositions.id, id),
          eq(portfolioPositions.userId, userId)
        )
      );
  } catch (error) {
    logError("Database.updatePortfolioPosition", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to update portfolio position: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function removePortfolioPosition(userId: number, id: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db
      .delete(portfolioPositions)
      .where(
        and(
          eq(portfolioPositions.id, id),
          eq(portfolioPositions.userId, userId)
        )
      );
  } catch (error) {
    logError("Database.removePortfolioPosition", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to remove portfolio position: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// ─── Alert Conditions ────────────────────────────────────────────────────────

export async function getAlertConditions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(alertConditions)
      .where(eq(alertConditions.userId, userId))
      .orderBy(desc(alertConditions.createdAt));
  } catch (error) {
    logError("Database.getAlertConditions", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get alert conditions: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function addAlertCondition(data: InsertAlertCondition) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db.insert(alertConditions).values(data);
    const inserted = await db
      .select()
      .from(alertConditions)
      .where(eq(alertConditions.userId, data.userId))
      .orderBy(desc(alertConditions.createdAt))
      .limit(1);
    return inserted[0];
  } catch (error) {
    logError("Database.addAlertCondition", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to add alert condition: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function toggleAlertCondition(
  userId: number,
  id: number,
  isActive: number
) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db
      .update(alertConditions)
      .set({ isActive })
      .where(
        and(eq(alertConditions.id, id), eq(alertConditions.userId, userId))
      );
  } catch (error) {
    logError("Database.toggleAlertCondition", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to toggle alert condition: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function removeAlertCondition(userId: number, id: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db
      .delete(alertConditions)
      .where(
        and(eq(alertConditions.id, id), eq(alertConditions.userId, userId))
      );
  } catch (error) {
    logError("Database.removeAlertCondition", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to remove alert condition: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getActiveAlertConditions() {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(alertConditions)
      .where(eq(alertConditions.isActive, 1));
  } catch (error) {
    logError("Database.getActiveAlertConditions", error);
    return [];
  }
}

export async function updateAlertLastTriggered(id: number) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .update(alertConditions)
      .set({ lastTriggeredAt: new Date() })
      .where(eq(alertConditions.id, id));
  } catch (error) {
    logError("Database.updateAlertLastTriggered", error);
  }
}

// ─── Scan History ────────────────────────────────────────────────────────────

export async function saveScanHistory(data: InsertScanHistory) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(scanHistory).values(data);
  } catch (error) {
    logError("Database.saveScanHistory", error);
  }
}

export async function getScanHistoryList(
  market: "us" | "kr" | "all",
  limit = 10
) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(scanHistory)
      .where(eq(scanHistory.market, market))
      .orderBy(desc(scanHistory.scannedAt))
      .limit(limit);
  } catch (error) {
    logError("Database.getScanHistoryList", error);
    return [];
  }
}

// ─── Trade Logs ─────────────────────────────────────────────────────────────

export async function getTradeLogs(userId: number, ticker: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(tradeLogs)
      .where(and(eq(tradeLogs.userId, userId), eq(tradeLogs.ticker, ticker)))
      .orderBy(desc(tradeLogs.date));
  } catch (error) {
    logError("Database.getTradeLogs", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get trade logs: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function addTradeLog(data: InsertTradeLog) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db.insert(tradeLogs).values(data);
  } catch (error) {
    logError("Database.addTradeLog", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to add trade log: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function deleteTradeLog(userId: number, id: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  try {
    await db
      .delete(tradeLogs)
      .where(and(eq(tradeLogs.userId, userId), eq(tradeLogs.id, id)));
  } catch (error) {
    logError("Database.deleteTradeLog", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to delete trade log: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// ─── Signal Performance Tracking ─────────────────────────────────────────────────────

/** 신호 성과 기록 생성 */
export async function recordSignalPerformance(data: InsertSignalPerformance) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(signalPerformance).values(data);
  } catch (e) {
    logError("Database.recordSignalPerformance", e);
  }
}

/** 대기 중인 신호 성과 기록 조회 (수익률 업데이트 대상) */
export async function getPendingSignalPerformances(olderThanDays: number = 7) {
  const db = await getDb();
  if (!db) return [];
  try {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    return db
      .select()
      .from(signalPerformance)
      .where(
        and(
          eq(signalPerformance.status, "pending"),
          lt(signalPerformance.createdAt, cutoff)
        )
      )
      .limit(100);
  } catch (error) {
    logError("Database.getPendingSignalPerformances", error);
    return [];
  }
}

/** 신호 성과 업데이트 (수익률 기록) */
export async function updateSignalPerformance(
  id: number,
  data: {
    exitPrice: number;
    profitLoss: number;
    profitLossPercent: number;
    daysHeld: number;
    status: "closed" | "cancelled";
  }
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .update(signalPerformance)
      .set({ ...data, closedAt: new Date() })
      .where(eq(signalPerformance.id, id));
  } catch (error) {
    logError("Database.updateSignalPerformance", error);
  }
}

/** 신호 성과 통계 조회 */
export async function getSignalPerformanceStats() {
  const db = await getDb();
  if (!db) return null;
  try {
    const all = await db
      .select()
      .from(signalPerformance)
      .where(eq(signalPerformance.status, "closed"));
    if (all.length === 0)
      return { total: 0, wins: 0, losses: 0, avgReturn: 0, winRate: 0 };
    let wins = 0;
    let losses = 0;
    let totalReturn = 0;
    for (const r of all) {
      const pct = Number(r.profitLossPercent ?? 0);
      totalReturn += pct;
      if (pct > 0) wins++;
      else losses++;
    }
    return {
      total: all.length,
      wins,
      losses,
      avgReturn: totalReturn / all.length,
      winRate: (wins / all.length) * 100,
    };
  } catch (error) {
    logError("Database.getSignalPerformanceStats", error);
    return null;
  }
}

/** 최근 신호 성과 기록 조회 */
export async function getRecentSignalPerformances(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(signalPerformance)
      .orderBy(desc(signalPerformance.createdAt))
      .limit(limit);
  } catch (error) {
    logError("Database.getRecentSignalPerformances", error);
    return [];
  }
}

// ─── Portfolio Snapshots ─────────────────────────────────────────────────────

export async function savePortfolioSnapshot(data: InsertPortfolioSnapshot) {
  const db = await getDb();
  if (!db) return;
  try {
    // 같은 날짜에 이미 존재하면 덮어쓰기
    const existing = await db
      .select()
      .from(portfolioSnapshots)
      .where(
        and(
          eq(portfolioSnapshots.userId, data.userId!),
          eq(portfolioSnapshots.snapshotDate, data.snapshotDate!)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(portfolioSnapshots)
        .set({
          totalValue: data.totalValue,
          totalInvested: data.totalInvested,
          pnlPercent: data.pnlPercent,
        })
        .where(eq(portfolioSnapshots.id, existing[0].id));
    } else {
      await db.insert(portfolioSnapshots).values(data);
    }
  } catch (error) {
    logError("Database.savePortfolioSnapshot", error);
  }
}

export async function getPortfolioSnapshots(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.userId, userId))
      .orderBy(desc(portfolioSnapshots.snapshotDate))
      .limit(limit);
  } catch (error) {
    logError("Database.getPortfolioSnapshots", error);
    return [];
  }
}

// ─── Alert History ─────────────────────────────────────────────────────────

export async function addAlertHistory(data: InsertAlertHistory) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(alertHistory).values(data);
  } catch (error) {
    logError("Database.addAlertHistory", error);
  }
}

export async function getAlertHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(alertHistory)
      .where(eq(alertHistory.userId, userId))
      .orderBy(desc(alertHistory.triggeredAt))
      .limit(limit);
  } catch (error) {
    logError("Database.getAlertHistory", error);
    return [];
  }
}

// ─── Watchlist Tag ─────────────────────────────────────────────────────────

export async function setWatchlistTag(
  userId: number,
  ticker: string,
  tag: string | null
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .update(watchlist)
      .set({ tag })
      .where(and(eq(watchlist.userId, userId), eq(watchlist.ticker, ticker)));
  } catch (error) {
    logError("Database.setWatchlistTag", error);
  }
}

// ─── User Notification Settings ──────────────────────────────────────────────

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    logError("Database.getUserById", error);
    return undefined;
  }
}

export async function updateUserNotificationSettings(
  userId: number,
  settings: { notifyEmail?: string | null; notifyWebhook?: string | null }
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(users).set(settings).where(eq(users.id, userId));
  } catch (error) {
    logError("Database.updateUserNotificationSettings", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to update notification settings: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function updateUserAutopilot(userId: number, enabled: 0 | 1) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .update(users)
      .set({ autopilotEnabled: enabled })
      .where(eq(users.id, userId));
  } catch (error) {
    logError("Database.updateUserAutopilot", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to update autopilot setting: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function updateUserBalance(
  userId: number,
  cashBalance: number,
  realizedPnl: number,
  krwBalance?: number,
  realizedPnlKrw?: number
) {
  const db = await getDb();
  if (!db) return;
  try {
    const updateData: any = { cashBalance, realizedPnl };
    if (krwBalance !== undefined) updateData.krwBalance = krwBalance;
    if (realizedPnlKrw !== undefined) updateData.realizedPnlKrw = realizedPnlKrw;
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  } catch (error) {
    logError("Database.updateUserBalance", error);
  }
}

// ─── News Summaries ──────────────────────────────────────────────────────────

// ─── News Summaries ──────────────────────────────────────────────────────────

export async function getCachedNewsSummary(ticker: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    // 1시간 이내의 캐시만 유효
    const result = await db
      .select()
      .from(newsSummaries)
      .where(and(eq(newsSummaries.ticker, ticker.toUpperCase())))
      .orderBy(desc(newsSummaries.analyzedAt))
      .limit(1);

    if (result.length > 0) {
      const cached = result[0];
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (cached.analyzedAt > oneHourAgo) return cached;
    }
    return null;
  } catch (error) {
    logError("Database.getCachedNewsSummary", error);
    return null;
  }
}

export async function saveNewsSummary(data: InsertNewsSummary) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(newsSummaries).values(data);
  } catch (error) {
    logError("Database.saveNewsSummary", error);
  }
}

// ─── Chart Pattern Cache ──────────────────────────────────────────────────

// ─── Chart Pattern Cache ──────────────────────────────────────────────────

export async function getCachedChartPattern(ticker: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(chartPatternCache)
      .where(and(eq(chartPatternCache.ticker, ticker.toUpperCase())))
      .orderBy(desc(chartPatternCache.analyzedAt))
      .limit(1);

    if (result.length > 0) {
      const cached = result[0];
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (cached.analyzedAt > thirtyMinsAgo) return cached;
    }
    return null;
  } catch (error) {
    logError("Database.getCachedChartPattern", error);
    return null;
  }
}

export async function saveChartPattern(data: InsertChartPatternCache) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(chartPatternCache).values(data);
  } catch (error) {
    logError("Database.saveChartPattern", error);
  }
}

// ─── Stock Notes ───────────────────────────────────────────────────────────

export async function getStockNote(userId: number, ticker: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(stockNotes)
      .where(
        and(
          eq(stockNotes.userId, userId),
          eq(stockNotes.ticker, ticker.toUpperCase())
        )
      )
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    logError("Database.getStockNote", error);
    return null;
  }
}

export async function upsertStockNote(
  userId: number,
  ticker: string,
  content: string
) {
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await getStockNote(userId, ticker);
    if (existing) {
      await db
        .update(stockNotes)
        .set({ content, updatedAt: new Date() })
        .where(eq(stockNotes.id, existing.id));
    } else {
      await db
        .insert(stockNotes)
        .values({ userId, ticker: ticker.toUpperCase(), content });
    }
  } catch (error) {
    logError("Database.upsertStockNote", error);
  }
}

export async function deleteStockNote(userId: number, ticker: string) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .delete(stockNotes)
      .where(
        and(
          eq(stockNotes.userId, userId),
          eq(stockNotes.ticker, ticker.toUpperCase())
        )
      );
  } catch (error) {
    logError("Database.deleteStockNote", error);
  }
}
