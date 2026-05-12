import { describe, expect, it } from "vitest";
import { runBacktest, type BacktestStrategy } from "./backtest";
import type { CandleData } from "../shared/types";

// Helper to generate mock candle data with indicators
function generateMockCandles(count: number, startPrice: number = 100): CandleData[] {
  const candles: CandleData[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const change = (Math.sin(i * 0.3) * 5) + (Math.random() - 0.5) * 2;
    price = Math.max(10, price + change);
    const open = price - change * 0.3;
    const high = Math.max(price, open) + Math.random() * 2;
    const low = Math.min(price, open) - Math.random() * 2;

    const date = new Date(2024, 0, 1);
    date.setDate(date.getDate() + i);

    candles.push({
      date: date.toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(price.toFixed(2)),
      volume: Math.floor(1000000 + Math.random() * 5000000),
      // Simulated indicators
      rsi: 30 + Math.sin(i * 0.2) * 25 + Math.random() * 10,
      ma5: Number((price - Math.sin(i * 0.1) * 3).toFixed(2)),
      ma20: Number((price - Math.sin(i * 0.05) * 5).toFixed(2)),
      ma60: Number((price - Math.sin(i * 0.02) * 8).toFixed(2)),
      macd: Math.sin(i * 0.15) * 2,
      macdSignal: Math.sin(i * 0.15 - 0.3) * 1.5,
      macdHistogram: Math.sin(i * 0.15) * 2 - Math.sin(i * 0.15 - 0.3) * 1.5,
    });
  }

  return candles;
}

describe("Backtest Engine", () => {
  it("returns valid result structure for RSI strategy", () => {
    const candles = generateMockCandles(100);
    const strategy: BacktestStrategy = {
      name: "RSI 전략",
      type: "rsi",
      params: { rsiBuyThreshold: 30, rsiSellThreshold: 70, initialCapital: 10000 },
    };

    const result = runBacktest(candles, strategy, "AAPL", "6mo");

    expect(result.ticker).toBe("AAPL");
    expect(result.strategyName).toBe("RSI 전략");
    expect(result.strategyType).toBe("rsi");
    expect(result.initialCapital).toBe(10000);
    expect(result.finalValue).toBeGreaterThan(0);
    expect(typeof result.totalReturn).toBe("number");
    expect(typeof result.winRate).toBe("number");
    expect(typeof result.maxDrawdown).toBe("number");
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(typeof result.buyAndHoldReturn).toBe("number");
  });

  it("returns valid result for MACD strategy", () => {
    const candles = generateMockCandles(100);
    const strategy: BacktestStrategy = {
      name: "MACD 전략",
      type: "macd",
      params: { initialCapital: 5000 },
    };

    const result = runBacktest(candles, strategy, "TSLA", "1y");

    expect(result.ticker).toBe("TSLA");
    expect(result.initialCapital).toBe(5000);
    expect(result.equityCurve.length).toBe(candles.length - 1);
  });

  it("returns valid result for MA cross strategy", () => {
    const candles = generateMockCandles(100);
    const strategy: BacktestStrategy = {
      name: "이동평균선 크로스 전략",
      type: "ma_cross",
      params: { maFastPeriod: 5, maSlowPeriod: 20, initialCapital: 10000 },
    };

    const result = runBacktest(candles, strategy, "005930.KS", "6mo");

    expect(result.ticker).toBe("005930.KS");
    expect(result.strategyType).toBe("ma_cross");
  });

  it("returns valid result for combined strategy", () => {
    const candles = generateMockCandles(200);
    const strategy: BacktestStrategy = {
      name: "복합 전략",
      type: "combined",
      params: {
        rsiBuyThreshold: 35,
        rsiSellThreshold: 65,
        initialCapital: 10000,
        positionSize: 80,
      },
    };

    const result = runBacktest(candles, strategy, "AAPL", "1y");

    expect(result.strategyType).toBe("combined");
    expect(result.period).toBe("1y");
  });

  it("handles empty candle data gracefully", () => {
    const strategy: BacktestStrategy = {
      name: "RSI 전략",
      type: "rsi",
      params: { initialCapital: 10000 },
    };

    const result = runBacktest([], strategy, "AAPL", "6mo");

    expect(result.totalTrades).toBe(0);
    expect(result.finalValue).toBe(10000);
    expect(result.totalReturn).toBe(0);
  });

  it("handles single candle data", () => {
    const candles = generateMockCandles(1);
    const strategy: BacktestStrategy = {
      name: "RSI 전략",
      type: "rsi",
      params: { initialCapital: 10000 },
    };

    const result = runBacktest(candles, strategy, "AAPL", "6mo");

    expect(result.totalTrades).toBe(0);
  });

  it("win rate is between 0 and 100", () => {
    const candles = generateMockCandles(200);
    const strategy: BacktestStrategy = {
      name: "RSI 전략",
      type: "rsi",
      params: { rsiBuyThreshold: 40, rsiSellThreshold: 60, initialCapital: 10000 },
    };

    const result = runBacktest(candles, strategy, "AAPL", "1y");

    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
  });

  it("max drawdown is non-negative", () => {
    const candles = generateMockCandles(100);
    const strategy: BacktestStrategy = {
      name: "MACD 전략",
      type: "macd",
      params: { initialCapital: 10000 },
    };

    const result = runBacktest(candles, strategy, "AAPL", "6mo");

    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it("equity curve dates are ordered", () => {
    const candles = generateMockCandles(50);
    const strategy: BacktestStrategy = {
      name: "RSI 전략",
      type: "rsi",
      params: { initialCapital: 10000 },
    };

    const result = runBacktest(candles, strategy, "AAPL", "3mo");

    for (let i = 1; i < result.equityCurve.length; i++) {
      expect(new Date(result.equityCurve[i].date).getTime())
        .toBeGreaterThanOrEqual(new Date(result.equityCurve[i - 1].date).getTime());
    }
  });

  it("trades alternate between buy and sell", () => {
    const candles = generateMockCandles(200);
    const strategy: BacktestStrategy = {
      name: "RSI 전략",
      type: "rsi",
      params: { rsiBuyThreshold: 40, rsiSellThreshold: 60, initialCapital: 10000 },
    };

    const result = runBacktest(candles, strategy, "AAPL", "1y");

    if (result.trades.length >= 2) {
      for (let i = 1; i < result.trades.length; i++) {
        expect(result.trades[i].type).not.toBe(result.trades[i - 1].type);
      }
    }
  });

  it("position size parameter limits investment amount", () => {
    const candles = generateMockCandles(100);
    const strategy: BacktestStrategy = {
      name: "RSI 전략",
      type: "rsi",
      params: { rsiBuyThreshold: 40, rsiSellThreshold: 60, initialCapital: 10000, positionSize: 50 },
    };

    const result = runBacktest(candles, strategy, "AAPL", "6mo");

    // With 50% position size, first buy should not use more than ~50% of capital
    if (result.trades.length > 0 && result.trades[0].type === "buy") {
      const firstBuy = result.trades[0];
      const investedAmount = firstBuy.shares * firstBuy.price;
      expect(investedAmount).toBeLessThanOrEqual(10000 * 0.55); // Allow small rounding
    }
  });
});

// ─── Grid Search / Optimize Tests ─────────────────────────────────────────────
import { runGridSearch, calcCompositeScore, type OptimizeParams } from "./backtest";

// Bollinger band mock candles (with bbUpper/bbLower fields)
function generateBollingerCandles(count: number, startPrice: number = 100): CandleData[] {
  const candles = generateMockCandles(count, startPrice);
  return candles.map((c, i) => ({
    ...c,
    bbUpper: c.close + 5 + Math.sin(i * 0.1) * 2,
    bbMiddle: c.close + Math.sin(i * 0.1),
    bbLower: c.close - 5 - Math.sin(i * 0.1) * 2,
  }));
}

describe("Grid Search (runGridSearch)", () => {
  it("returns correct structure for RSI strategy", () => {
    const candles = generateMockCandles(150);
    const opts: OptimizeParams = { strategyType: "rsi", objective: "totalReturn", topN: 3 };
    const result = runGridSearch(candles, "AAPL", "1y", opts);

    expect(result.results.length).toBeLessThanOrEqual(3);
    expect(result.totalCombinations).toBeGreaterThan(0);
    expect(result.aiRecommended).not.toBeNull();
    if (result.aiRecommended) {
      expect(typeof result.aiRecommended.compositeScore).toBe("number");
      expect(result.aiRecommended.strategyType).toBe("rsi");
    }
  });

  it("returns correct structure for MA cross strategy", () => {
    const candles = generateMockCandles(150);
    const opts: OptimizeParams = { strategyType: "ma_cross", objective: "winRate", topN: 3 };
    const result = runGridSearch(candles, "TSLA", "1y", opts);

    expect(result.results.length).toBeGreaterThanOrEqual(0);
    expect(result.totalCombinations).toBeGreaterThan(0);
  });

  it("returns correct structure for bollinger strategy", () => {
    const candles = generateBollingerCandles(150);
    const opts: OptimizeParams = { strategyType: "bollinger", objective: "totalReturn", topN: 3 };
    const result = runGridSearch(candles, "NVDA", "1y", opts);

    expect(result.totalCombinations).toBe(9); // 3 periods × 3 stdDevs
    if (result.aiRecommended) {
      expect(result.aiRecommended.strategyType).toBe("bollinger");
    }
  });

  it("returns correct structure for combined strategy", () => {
    const candles = generateMockCandles(200);
    const opts: OptimizeParams = { strategyType: "combined", objective: "sharpeRatio", topN: 5 };
    const result = runGridSearch(candles, "MSFT", "1y", opts);

    expect(result.results.length).toBeLessThanOrEqual(5);
    expect(result.totalCombinations).toBeGreaterThan(0);
  });

  it("results are sorted by objective (totalReturn)", () => {
    const candles = generateMockCandles(150);
    const opts: OptimizeParams = { strategyType: "rsi", objective: "totalReturn", topN: 5 };
    const result = runGridSearch(candles, "AAPL", "1y", opts);

    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i - 1].totalReturn).toBeGreaterThanOrEqual(result.results[i].totalReturn);
    }
  });

  it("aiRecommended has highest composite score", () => {
    const candles = generateMockCandles(150);
    const opts: OptimizeParams = { strategyType: "rsi", objective: "totalReturn", topN: 5 };
    const result = runGridSearch(candles, "AAPL", "1y", opts);

    if (result.aiRecommended && result.results.length > 0) {
      for (const r of result.results) {
        expect(result.aiRecommended.compositeScore).toBeGreaterThanOrEqual(r.compositeScore - 0.001);
      }
    }
  });

  it("handles empty candles gracefully", () => {
    const opts: OptimizeParams = { strategyType: "rsi", objective: "totalReturn", topN: 3 };
    const result = runGridSearch([], "AAPL", "1y", opts);
    expect(result.results).toEqual([]);
    expect(result.aiRecommended).toBeNull();
  });
});

describe("calcCompositeScore", () => {
  it("returns higher score for better performance", () => {
    const goodResult = {
      totalReturn: 50,
      winRate: 70,
      maxDrawdown: 10,
      equityCurve: Array(252).fill({ date: new Date().toISOString(), value: 10000, drawdown: 0 }),
    } as Parameters<typeof calcCompositeScore>[0];

    const badResult = {
      totalReturn: 5,
      winRate: 40,
      maxDrawdown: 30,
      equityCurve: Array(252).fill({ date: new Date().toISOString(), value: 10000, drawdown: 0 }),
    } as Parameters<typeof calcCompositeScore>[0];

    expect(calcCompositeScore(goodResult)).toBeGreaterThan(calcCompositeScore(badResult));
  });

  it("penalizes high drawdown", () => {
    const lowMdd = {
      totalReturn: 20,
      winRate: 60,
      maxDrawdown: 5,
      equityCurve: Array(252).fill({ date: new Date().toISOString(), value: 10000, drawdown: 0 }),
    } as Parameters<typeof calcCompositeScore>[0];

    const highMdd = {
      totalReturn: 20,
      winRate: 60,
      maxDrawdown: 40,
      equityCurve: Array(252).fill({ date: new Date().toISOString(), value: 10000, drawdown: 0 }),
    } as Parameters<typeof calcCompositeScore>[0];

    expect(calcCompositeScore(lowMdd)).toBeGreaterThan(calcCompositeScore(highMdd));
  });
});
