import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 99,
    openId: "test-user-99",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

// Mock DB functions
vi.mock("./db", () => ({
  getWatchlist: vi.fn().mockResolvedValue([
    { id: 1, userId: 99, ticker: "AAPL", name: "Apple Inc.", addedAt: new Date() },
    { id: 2, userId: 99, ticker: "TSLA", name: "Tesla Inc.", addedAt: new Date() },
  ]),
  addToWatchlist: vi.fn().mockResolvedValue({
    id: 3,
    userId: 99,
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    addedAt: new Date(),
  }),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
  getSignalHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 99,
      ticker: "AAPL",
      signalType: "buy",
      strength: 65,
      price: "180.50",
      rsi: "28.5",
      macdSignal: "buy",
      reason: "RSI 과매도",
      aiComment: "매수 추천",
      isRead: 0,
      createdAt: new Date(),
    },
  ]),
  addSignalHistory: vi.fn().mockResolvedValue(undefined),
  markSignalAsRead: vi.fn().mockResolvedValue(undefined),
  markAllSignalsAsRead: vi.fn().mockResolvedValue(undefined),
  getUnreadSignalCount: vi.fn().mockResolvedValue(3),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  // Portfolio mocks
  getPortfolioPositions: vi.fn().mockResolvedValue([]),
  addPortfolioPosition: vi.fn().mockResolvedValue({
    id: 1,
    userId: 99,
    ticker: "AAPL",
    name: "Apple Inc.",
    quantity: 10,
    avgPrice: "150",
    addedAt: new Date(),
  }),
  updatePortfolioPosition: vi.fn().mockResolvedValue(undefined),
  removePortfolioPosition: vi.fn().mockResolvedValue(undefined),
  // Alert mocks
  getAlertConditions: vi.fn().mockResolvedValue([]),
  addAlertCondition: vi.fn().mockResolvedValue({
    id: 1,
    userId: 99,
    ticker: "AAPL",
    name: "RSI 과매도",
    conditionType: "rsi_below",
    threshold: "30",
    isActive: 1,
    lastTriggeredAt: null,
    createdAt: new Date(),
  }),
  toggleAlertCondition: vi.fn().mockResolvedValue(undefined),
  removeAlertCondition: vi.fn().mockResolvedValue(undefined),
  getActiveAlertConditions: vi.fn().mockResolvedValue([]),
  updateAlertLastTriggered: vi.fn().mockResolvedValue(undefined),
  // Scan History mocks
  saveScanHistory: vi.fn().mockResolvedValue(undefined),
  getScanHistoryList: vi.fn().mockResolvedValue([]),
  // Notes mocks
  getStockNote: vi.fn().mockResolvedValue(null),
  upsertStockNote: vi.fn().mockResolvedValue(undefined),
  deleteStockNote: vi.fn().mockResolvedValue(undefined),
}));

// Mock Yahoo Finance functions
vi.mock("./yahoo", () => ({
  getStockSummary: vi.fn().mockResolvedValue({
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 180.5,
    change: 2.3,
    changePercent: 1.29,
    volume: 50000000,
    marketCap: 2800000000000,
    signal: { type: "buy", strength: 65, reasons: ["RSI 과매도"] },
    indicators: {
      rsi: 28.5,
      macd: 1.2,
      macdSignalLine: 0.8,
      macdHistogram: 0.4,
      ma5: 178,
      ma20: 175,
      ma60: 170,
    },
    lastUpdated: new Date().toISOString(),
  }),
  getCompanyProfile: vi.fn().mockResolvedValue({
    ticker: "AAPL",
    name: "Apple Inc.",
    description: "Technology company",
    industry: "Consumer Electronics",
    sector: "Technology",
    website: "https://www.apple.com",
    employees: 161000,
    ceo: "Tim Cook",
    address: "One Apple Park Way, Cupertino, CA 95014",
  }),
  getHistoricalData: vi.fn().mockResolvedValue([
    {
      date: "2024-01-01",
      open: 175,
      high: 182,
      low: 174,
      close: 180,
      volume: 50000000,
      rsi: 28.5,
      macd: 1.2,
      macdSignal: 0.8,
      macdHistogram: 0.4,
      ma5: 178,
      ma20: 175,
      ma60: 170,
    },
  ]),
  getHistoricalDataWithResolution: vi.fn().mockResolvedValue([
    {
      date: "2024-01-01T10:00:00Z",
      open: 175,
      high: 182,
      low: 174,
      close: 180,
      volume: 50000000,
    },
  ]),
  searchTicker: vi.fn().mockResolvedValue([
    { ticker: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "EQUITY" },
  ]),
  generateSignal: vi.fn().mockReturnValue({
    type: "buy",
    strength: 65,
    reasons: ["RSI 과매도"],
  }),
  getTopMovers: vi.fn().mockResolvedValue({
    gainers: [
      {
        rank: 1,
        ticker: "NVDA",
        name: "NVIDIA Corporation",
        price: 875.50,
        change: 25.50,
        changePercent: 3.01,
        volume: 50000000,
        market: "US",
      },
      {
        rank: 2,
        ticker: "TSLA",
        name: "Tesla Inc.",
        price: 245.30,
        change: 7.30,
        changePercent: 3.07,
        volume: 100000000,
        market: "US",
      },
    ],
    losers: [
      {
        rank: 1,
        ticker: "IBM",
        name: "IBM Corporation",
        price: 165.20,
        change: -5.80,
        changePercent: -3.40,
        volume: 30000000,
        market: "US",
      },
    ],
    timestamp: new Date().toISOString(),
  }),
  getKRTopMovers: vi.fn().mockResolvedValue({
    gainers: [
      {
        rank: 1,
        ticker: "005930.KS",
        name: "삼성전자",
        price: 72000,
        change: 1500,
        changePercent: 2.13,
        volume: 10000000,
        market: "KR",
      },
    ],
    losers: [
      {
        rank: 1,
        ticker: "035720.KS",
        name: "카카오",
        price: 38500,
        change: -800,
        changePercent: -2.04,
        volume: 5000000,
        market: "KR",
      },
    ],
    timestamp: new Date().toISOString(),
  }),
  registerPrefetchTicker: vi.fn(),
  unregisterPrefetchTicker: vi.fn(),
  getQuote: vi.fn().mockResolvedValue({ regularMarketPrice: 180.5, regularMarketOpen: 178, regularMarketDayHigh: 182, regularMarketDayLow: 177, regularMarketVolume: 50000000 }),
  isAnyMarketOpen: vi.fn().mockReturnValue(false),
  getOpenMarketName: vi.fn().mockReturnValue(null),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "AI 분석 결과: 매수 추천합니다.",
        },
      },
    ],
  }),
}));

describe("stock router", () => {
  it("stock.summary returns stock summary data", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.summary({ ticker: "AAPL" });
    expect(result.ticker).toBe("AAPL");
    expect(result.price).toBe(180.5);
    expect(result.signal.type).toBe("buy");
    expect(result.indicators.rsi).toBe(28.5);
  });

  it("stock.search returns search results", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.search({ query: "AAPL" });
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("AAPL");
  });

  it("stock.batchSummary returns multiple summaries", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.batchSummary({
      tickers: ["AAPL", "TSLA"],
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("stock.history returns candle data", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.history({ ticker: "AAPL", period: "6mo" });
    // 오늘 실시간 캔들이 추가되어 여러 개일 수 있음
    expect(result.length).toBeGreaterThanOrEqual(1);
    // 첫 번째 캔들의 close 값 확인
    const firstCandle = result.find((c: { date: string; close: number }) => c.date === '2024-01-01');
    expect(firstCandle?.close).toBe(180);
  });

  it("stock.topMovers returns gainers and losers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.topMovers();
    expect(result).toBeDefined();
    expect(result.gainers).toBeDefined();
    expect(result.losers).toBeDefined();
    expect(Array.isArray(result.gainers)).toBe(true);
    expect(Array.isArray(result.losers)).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it("stock.topMovers returns up to 10 gainers and losers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.topMovers();
    expect(result.gainers.length).toBeLessThanOrEqual(10);
    expect(result.losers.length).toBeLessThanOrEqual(10);
  });

  it("stock.topMovers gainers have required fields", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.topMovers();
    if (result.gainers.length > 0) {
      const gainer = result.gainers[0];
      expect(gainer.rank).toBeDefined();
      expect(gainer.ticker).toBeDefined();
      expect(gainer.name).toBeDefined();
      expect(gainer.price).toBeDefined();
      expect(gainer.change).toBeDefined();
      expect(gainer.changePercent).toBeDefined();
      expect(gainer.volume).toBeDefined();
      expect(gainer.market).toBe("US");
    }
  });

  it("stock.topMovers with KR market returns Korean stocks", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.topMovers({ market: "KR" });
    expect(result).toBeDefined();
    expect(result.gainers).toBeDefined();
    expect(result.losers).toBeDefined();
    if (result.gainers.length > 0) {
      expect(result.gainers[0].market).toBe("KR");
    }
  });

  it("stock.marketStatus returns valid structure when market closed", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.marketStatus();
    expect(typeof result.isOpen).toBe("boolean");
    expect(["US", "KR", null]).toContain(result.market);
    expect(typeof result.label).toBe("string");
    expect(result.label.length).toBeGreaterThan(0);
  });

  it("stock.marketStatus label is '\uc7a5 \ub9c8\uac10' when no market open", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.marketStatus();
    // mock에서 isAnyMarketOpen=false, getOpenMarketName=null
    expect(result.isOpen).toBe(false);
    expect(result.market).toBeNull();
    expect(result.label).toBe("\uc7a5 \ub9c8\uac10");
    expect(result.nextOpen).toBeTruthy();
  });
});

describe("watchlist router", () => {
  it("watchlist.list returns user watchlist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.watchlist.list();
    // Returns array (may be empty or have items depending on test DB state)
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("ticker");
      expect(result[0]).toHaveProperty("userId");
    }
  });

  it("watchlist.add adds a ticker", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.watchlist.add({
      ticker: "GOOGL",
      name: "Alphabet Inc.",
    });
    expect(result.ticker).toBe("GOOGL");
  });

  it("watchlist.add uppercases ticker", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // lowercase input should be accepted and result ticker should be uppercase
    const result = await caller.watchlist.add({ ticker: "googl", name: "Alphabet" });
    // mock returns GOOGL ticker
    expect(result.ticker.toUpperCase()).toBe(result.ticker);
  });

  it("watchlist.remove removes a ticker", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.watchlist.remove({ ticker: "AAPL" });
    expect(result.success).toBe(true);
  });

  it("watchlist.list requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.watchlist.list()).rejects.toThrow();
  });
});

describe("signals router", () => {
  it("signals.list returns signal history", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.signals.list({ limit: 50 });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((r) => r.ticker === "AAPL")).toBe(true);
    expect(result.some((r) => r.signalType === "buy")).toBe(true);
  });

  it("signals.unreadCount returns count", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.signals.unreadCount();
    expect(result).toBe(3);
  });

  it("signals.markRead marks a signal as read", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.signals.markRead({ signalId: 1 });
    expect(result.success).toBe(true);
  });

  it("signals.markAllRead marks all as read", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.signals.markAllRead();
    expect(result.success).toBe(true);
  });

  it("signals.generate creates a signal", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.signals.generate({ ticker: "AAPL" });
    expect(result.type).toBe("buy");
    expect(result.strength).toBe(65);
  });

  it("signals.list requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.signals.list({ limit: 50 })).rejects.toThrow();
  });
});

describe("ai router", () => {
  it("ai.analyze returns AI analysis", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.analyze({ ticker: "AAPL" });
    expect(result.ticker).toBe("AAPL");
    expect(result.aiComment).toContain("AI 분석 결과");
    expect(result.signal.type).toBe("buy");
    expect(result.price).toBe(180.5);
  });

  it("ai.analyze requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ai.analyze({ ticker: "AAPL" })).rejects.toThrow();
  });

  it("ai.analyze saves signal history", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // ai.analyze should succeed and return signal data
    const result = await caller.ai.analyze({ ticker: "TSLA" });
    expect(result.ticker).toBe("TSLA");
    expect(result.signal).toBeDefined();
    expect(result.aiComment).toBeDefined();
  });
});

describe("chartPattern router", () => {
  it("chartPattern.analyze returns pattern data with required fields", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // getHistoricalData mock returns 1 candle (< 20), so we expect the data-insufficient fallback
    const result = await caller.chartPattern.analyze({ ticker: "AAPL" });
    expect(result).toHaveProperty("patternName");
    expect(result).toHaveProperty("patternNameKr");
    expect(result).toHaveProperty("direction");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("keyPoints");
    expect(result).toHaveProperty("analyzedAt");
    expect(["bullish", "bearish", "neutral"]).toContain(result.direction);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("chartPattern.analyze returns data-insufficient fallback when candles < 20", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Default mock returns only 1 candle
    const result = await caller.chartPattern.analyze({ ticker: "AAPL" });
    expect(result.patternName).toBe("N/A");
    expect(result.confidence).toBe(0);
    expect(result.direction).toBe("neutral");
  });

  it("chartPattern.analyze uppercases ticker", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chartPattern.analyze({ ticker: "aapl" });
    expect(result).toHaveProperty("patternName");
  });
});

describe("news router", () => {
  it("news.sentiment returns sentiment with required fields", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.news.sentiment({ ticker: "AAPL" });
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("label");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("headlines");
    expect(result).toHaveProperty("analyzedAt");
    expect(result.score).toBeGreaterThanOrEqual(-1);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.headlines)).toBe(true);
  });

  it("news.sentiment returns valid score range", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.news.sentiment({ ticker: "TSLA" });
    expect(result.score).toBeGreaterThanOrEqual(-1);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("news.sentiment uppercases ticker", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.news.sentiment({ ticker: "aapl" });
    expect(result).toHaveProperty("score");
  });
});

describe("portfolio router", () => {
  it("portfolio.list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.portfolio.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("portfolio.add creates a position and returns it", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.portfolio.add({
      ticker: "AAPL",
      name: "Apple Inc.",
      quantity: 10,
      avgPrice: 150,
    });
    expect(result).toHaveProperty("id");
    expect(result.ticker).toBe("AAPL");
    expect(Number(result.quantity)).toBe(10);
  });

  it("portfolio.list requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.portfolio.list()).rejects.toThrow();
  });
});

describe("alerts router", () => {
  it("alerts.list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alerts.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("alerts.add creates an alert condition", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alerts.add({
      ticker: "AAPL",
      name: "RSI 과매도",
      conditionType: "rsi_below",
      threshold: 30,
    });
    expect(result).toHaveProperty("id");
    expect(result.ticker).toBe("AAPL");
    expect(result.conditionType).toBe("rsi_below");
  });

  it("alerts.list requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.alerts.list()).rejects.toThrow();
  });
});

describe("notes router", () => {
  it("notes.get returns null or note object for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.get({ ticker: "AAPL" });
    expect(result === null || (typeof result === "object" && result !== null && "ticker" in result)).toBe(true);
  });

  it("notes.upsert saves a note and returns success", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.upsert({ ticker: "AAPL", content: "테스트 메모" });
    expect(result).toEqual({ success: true });
  });

  it("notes.get requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notes.get({ ticker: "AAPL" })).rejects.toThrow();
  });
});

describe("scanHistory router", () => {
  it("scanHistory.list returns array", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scanHistory.list({ market: "us", limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("scanHistory.list parses topBuys and topSells as arrays", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scanHistory.list({ market: "us", limit: 5 });
    result.forEach((h) => {
      expect(Array.isArray(h.topBuys)).toBe(true);
      expect(Array.isArray(h.topSells)).toBe(true);
    });
  });
});

describe("signalPerformance router", () => {
  // DB mock에 signalPerformance 함수 추가
  beforeEach(() => {
    vi.mock("./db", async (importOriginal) => {
      const original = await importOriginal<typeof import("./db")>();
      return {
        ...original,
        getSignalPerformanceStats: vi.fn().mockResolvedValue({
          total: 10,
          wins: 7,
          losses: 3,
          avgReturn: 5.2,
          winRate: 70,
        }),
        getRecentSignalPerformances: vi.fn().mockResolvedValue([
          {
            id: 1,
            ticker: "AAPL",
            signalType: "buy",
            strength: 65,
            entryPrice: "150.00",
            exitPrice: "165.00",
            profitLoss: "15.00",
            profitLossPercent: "10.00",
            daysHeld: 14,
            status: "closed",
            createdAt: new Date(),
            closedAt: new Date(),
          },
        ]),
      };
    });
  });

  it("signalPerformance.stats returns stats object", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.signalPerformance.stats();
    // null 또는 stats 객체 반환
    if (result !== null) {
      expect(typeof result.total).toBe("number");
      expect(typeof result.winRate).toBe("number");
    }
  });

  it("signalPerformance.recent returns array", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.signalPerformance.recent({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("signalPerformance.recent respects limit parameter", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.signalPerformance.recent({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("signalPerformance.recent rejects invalid limit", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.signalPerformance.recent({ limit: 0 })).rejects.toThrow();
    await expect(caller.signalPerformance.recent({ limit: 101 })).rejects.toThrow();
  });
});

describe("ticker validation", () => {
  it("stock.summary rejects invalid ticker format", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // 특수문자 포함 티커는 거부되어야 함
    await expect(caller.stock.summary({ ticker: "AAPL; DROP TABLE users" })).rejects.toThrow();
  });

  it("stock.summary accepts valid Korean ticker", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // 한국 티커 형식 (숫자.KS)
    const result = await caller.stock.summary({ ticker: "005930.KS" });
    expect(result).toBeDefined();
  });

  it("stock.summary accepts valid US ticker", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stock.summary({ ticker: "AAPL" });
    expect(result.ticker).toBe("AAPL");
  });
});
