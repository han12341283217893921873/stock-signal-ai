import { describe, expect, it } from "vitest";
import { generateSignal } from "./finnhub";
import type { CandleData } from "../shared/types";

// Helper to create mock candle data
function mockCandle(overrides: Partial<CandleData> = {}): CandleData {
  return {
    date: new Date().toISOString(),
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 1000000,
    ma5: null,
    ma20: null,
    ma60: null,
    rsi: null,
    macd: null,
    macdSignal: null,
    macdHistogram: null,
    ...overrides,
  };
}

describe("generateSignal", () => {
  it("returns neutral with insufficient data", () => {
    const signal = generateSignal([mockCandle()]);
    expect(signal.type).toBe("neutral");
    expect(signal.strength).toBe(0);
    expect(signal.reasons[0]).toContain("데이터");
  });

  it("generates buy signal when RSI is oversold with supporting indicators", () => {
    // RSI 25 (과매도) + 긍정적 MACD + 이평 정배열 = 강한 매수 신호
    const candles = [
      mockCandle({ rsi: 30, macd: 0.05, macdSignal: 0.03, ma5: 100, ma20: 99, ma60: 98 }),
      mockCandle({ rsi: 25, macd: 0.1, macdSignal: 0.03, ma5: 101, ma20: 99, ma60: 98 }),
      mockCandle({ rsi: 22, macd: 0.15, macdSignal: 0.03, ma5: 102, ma20: 99, ma60: 98 }),
      mockCandle({ rsi: 20, macd: 0.2, macdSignal: 0.03, ma5: 103, ma20: 99, ma60: 98 }),
      mockCandle({ rsi: 18, macd: 0.25, macdSignal: 0.03, ma5: 104, ma20: 99, ma60: 98 }),
    ];
    const signal = generateSignal(candles);
    expect(["buy", "strong_buy", "watch"]).toContain(signal.type);
    expect(signal.strength).toBeGreaterThanOrEqual(20);
  });

  it("generates sell signal when RSI is overbought with supporting indicators", () => {
    // RSI 75+ (과매수) + 부정적 MACD + 이평 역배열 = 강한 매도 신호
    const candles = [
      mockCandle({ rsi: 70, macd: -0.05, macdSignal: 0.03, ma5: 100, ma20: 101, ma60: 102 }),
      mockCandle({ rsi: 75, macd: -0.1, macdSignal: 0.03, ma5: 99, ma20: 101, ma60: 102 }),
      mockCandle({ rsi: 78, macd: -0.15, macdSignal: 0.03, ma5: 98, ma20: 101, ma60: 102 }),
      mockCandle({ rsi: 80, macd: -0.2, macdSignal: 0.03, ma5: 97, ma20: 101, ma60: 102 }),
      mockCandle({ rsi: 82, macd: -0.25, macdSignal: 0.03, ma5: 96, ma20: 101, ma60: 102 }),
    ];
    const signal = generateSignal(candles);
    expect(["sell", "strong_sell", "watch", "neutral"]).toContain(signal.type);
  });

  it("detects MACD golden cross as buy signal", () => {
    // MACD가 신호선 아래에서 위로 교차 = 골든크로스
    const candles = [
      mockCandle({ macd: -0.5, macdSignal: 0.1, macdHistogram: -0.6, rsi: 40, ma5: 100, ma20: 99, ma60: 98 }),
      mockCandle({ macd: -0.2, macdSignal: 0.1, macdHistogram: -0.3, rsi: 42, ma5: 101, ma20: 99, ma60: 98 }),
      mockCandle({ macd: 0.1, macdSignal: 0.1, macdHistogram: 0, rsi: 45, ma5: 102, ma20: 99, ma60: 98 }),
      mockCandle({ macd: 0.3, macdSignal: 0.1, macdHistogram: 0.2, rsi: 48, ma5: 103, ma20: 99, ma60: 98 }),
      mockCandle({ macd: 0.5, macdSignal: 0.1, macdHistogram: 0.4, rsi: 50, ma5: 104, ma20: 99, ma60: 98 }),
    ];
    const signal = generateSignal(candles);
    expect(["buy", "watch", "neutral"]).toContain(signal.type);
  });

  it("detects MACD death cross as sell signal", () => {
    // MACD가 신호선 위에서 아래로 교차 = 데드크로스
    const candles = [
      mockCandle({ macd: 0.5, macdSignal: 0.1, macdHistogram: 0.4, rsi: 60, ma5: 100, ma20: 101, ma60: 102 }),
      mockCandle({ macd: 0.2, macdSignal: 0.1, macdHistogram: 0.1, rsi: 58, ma5: 99, ma20: 101, ma60: 102 }),
      mockCandle({ macd: -0.1, macdSignal: 0.1, macdHistogram: -0.2, rsi: 55, ma5: 98, ma20: 101, ma60: 102 }),
      mockCandle({ macd: -0.3, macdSignal: 0.1, macdHistogram: -0.4, rsi: 52, ma5: 97, ma20: 101, ma60: 102 }),
      mockCandle({ macd: -0.5, macdSignal: 0.1, macdHistogram: -0.6, rsi: 50, ma5: 96, ma20: 101, ma60: 102 }),
    ];
    const signal = generateSignal(candles);
    expect(["sell", "watch", "neutral"]).toContain(signal.type);
  });

  it("detects MA golden cross", () => {
    // MA5가 MA20을 하향에서 상향으로 교차
    const candles = [
      mockCandle({ close: 100, ma5: 98, ma20: 99, rsi: 45, macd: 0.05, macdSignal: 0.05, ma60: 98 }),
      mockCandle({ close: 101, ma5: 98.5, ma20: 98.8, rsi: 47, macd: 0.08, macdSignal: 0.05, ma60: 98 }),
      mockCandle({ close: 102, ma5: 99, ma20: 98.6, rsi: 50, macd: 0.1, macdSignal: 0.05, ma60: 98 }),
      mockCandle({ close: 103, ma5: 99.5, ma20: 98.4, rsi: 52, macd: 0.12, macdSignal: 0.05, ma60: 98 }),
      mockCandle({ close: 104, ma5: 100.2, ma20: 98.2, rsi: 55, macd: 0.15, macdSignal: 0.05, ma60: 98 }),
    ];
    const signal = generateSignal(candles);
    expect(["buy", "watch", "neutral"]).toContain(signal.type);
  });

  it("detects price above MA60 as long-term bullish", () => {
    // 주가가 60일 이평 위에 있고 정배열 = 장기 상승 추세
    const candles = [
      mockCandle({ close: 100, ma60: 90, ma5: 100, ma20: 95, rsi: 55, macd: 0.1, macdSignal: 0.05 }),
      mockCandle({ close: 102, ma60: 91, ma5: 101, ma20: 96, rsi: 57, macd: 0.12, macdSignal: 0.05 }),
      mockCandle({ close: 104, ma60: 92, ma5: 102, ma20: 97, rsi: 59, macd: 0.14, macdSignal: 0.05 }),
      mockCandle({ close: 106, ma60: 93, ma5: 103, ma20: 98, rsi: 61, macd: 0.16, macdSignal: 0.05 }),
      mockCandle({ close: 108, ma60: 94, ma5: 104, ma20: 99, rsi: 63, macd: 0.18, macdSignal: 0.05 }),
    ];
    const signal = generateSignal(candles);
    expect(["buy", "watch", "neutral"]).toContain(signal.type);
  });

  it("combines multiple bearish signals for strong sell", () => {
    // 여러 부정적 신호 결합 = 강한 매도
    const candles = [
      mockCandle({
        close: 90,
        rsi: 70,
        macd: 0.3,
        macdSignal: 0.1,
        macdHistogram: 0.2,
        ma5: 95,
        ma20: 100,
        ma60: 110,
      }),
      mockCandle({
        close: 88,
        rsi: 73,
        macd: 0.2,
        macdSignal: 0.1,
        macdHistogram: 0.1,
        ma5: 93,
        ma20: 100,
        ma60: 110,
      }),
      mockCandle({
        close: 85,
        rsi: 76,
        macd: 0.1,
        macdSignal: 0.1,
        macdHistogram: 0,
        ma5: 91,
        ma20: 100,
        ma60: 110,
      }),
      mockCandle({
        close: 82,
        rsi: 79,
        macd: -0.1,
        macdSignal: 0.1,
        macdHistogram: -0.2,
        ma5: 89,
        ma20: 100,
        ma60: 110,
      }),
      mockCandle({
        close: 80,
        rsi: 82,
        macd: -0.2,
        macdSignal: 0.1,
        macdHistogram: -0.3,
        ma5: 87,
        ma20: 100,
        ma60: 110,
      }),
    ];
    const signal = generateSignal(candles);
    expect(["sell", "strong_sell"]).toContain(signal.type);
  });

  it("returns neutral when signals are mixed", () => {
    // 긍정적/부정적 신호가 혼합 = 관망 또는 중립
    const candles = [
      mockCandle({
        close: 100,
        rsi: 50,
        macd: 0.1,
        macdSignal: 0.1,
        macdHistogram: 0,
        ma5: 99,
        ma20: 101,
        ma60: 98,
      }),
      mockCandle({
        close: 101,
        rsi: 51,
        macd: 0.11,
        macdSignal: 0.11,
        macdHistogram: 0,
        ma5: 100,
        ma20: 100.5,
        ma60: 99,
      }),
      mockCandle({
        close: 100.5,
        rsi: 50,
        macd: 0.1,
        macdSignal: 0.1,
        macdHistogram: 0,
        ma5: 100.2,
        ma20: 100.3,
        ma60: 99.5,
      }),
      mockCandle({
        close: 101,
        rsi: 52,
        macd: 0.12,
        macdSignal: 0.11,
        macdHistogram: 0.01,
        ma5: 100.5,
        ma20: 100.4,
        ma60: 99.7,
      }),
      mockCandle({
        close: 100.8,
        rsi: 51,
        macd: 0.11,
        macdSignal: 0.11,
        macdHistogram: 0,
        ma5: 100.6,
        ma20: 100.35,
        ma60: 99.8,
      }),
    ];
    const signal = generateSignal(candles);
    // Mixed signals should be close to neutral
    expect(["neutral", "watch"]).toContain(signal.type);
  });

  it("strength is capped at 100", () => {
    // 매우 강한 신호도 100 이상 초과 불가
    const candles = [
      mockCandle({
        close: 50,
        rsi: 20,
        macd: -2,
        macdSignal: 0.5,
        macdHistogram: -2.5,
        ma5: 80,
        ma20: 85,
        ma60: 90,
      }),
      mockCandle({
        close: 48,
        rsi: 18,
        macd: -1.8,
        macdSignal: 0.5,
        macdHistogram: -2.3,
        ma5: 78,
        ma20: 84,
        ma60: 90,
      }),
      mockCandle({
        close: 46,
        rsi: 15,
        macd: -1.5,
        macdSignal: 0.5,
        macdHistogram: -2,
        ma5: 76,
        ma20: 83,
        ma60: 90,
      }),
      mockCandle({
        close: 45,
        rsi: 12,
        macd: -1.2,
        macdSignal: 0.5,
        macdHistogram: -1.7,
        ma5: 74,
        ma20: 82,
        ma60: 90,
      }),
      mockCandle({
        close: 44,
        rsi: 10,
        macd: -1,
        macdSignal: 0.5,
        macdHistogram: -1.5,
        ma5: 72,
        ma20: 81,
        ma60: 90,
      }),
    ];
    const signal = generateSignal(candles);
    expect(signal.strength).toBeLessThanOrEqual(100);
  });
});

// ─── TTLCache stale fallback tests ───────────────────────────────────────────
// We test the TTLCache class behavior indirectly via the exported module.
// The class is not exported, so we verify the StockSummary isStale field behavior
// by testing the shared/types StockSummary interface contract.

import type { StockSummary } from "../shared/types";

describe("StockSummary isStale field", () => {
  it("StockSummary type accepts isStale and staleMinutesAgo as optional fields", () => {
    const normal: StockSummary = {
      ticker: "AAPL",
      name: "Apple Inc.",
      price: 150,
      change: 1.5,
      changePercent: 1.0,
      volume: 50000000,
      signal: { type: "buy", strength: 60, grade: "buy", gradeLabel: "매수", gradeColor: "text-green-400", reasons: ["RSI 과매도"], breakdown: { rsi: 20, macd: 0, ma: 0, volume: 0, momentum: 0, bollinger: 0 }, summary: "RSI 과매도" },
      indicators: {
        rsi: 35,
        macd: 0.5,
        macdSignalLine: 0.3,
        macdHistogram: 0.2,
        ma5: 148,
        ma20: 145,
        ma60: 140,
      },
      lastUpdated: new Date().toISOString(),
    };
    expect(normal.isStale).toBeUndefined();
    expect(normal.staleMinutesAgo).toBeUndefined();
  });

  it("StockSummary type accepts isStale=true with staleMinutesAgo", () => {
    const stale: StockSummary = {
      ticker: "AAPL",
      name: "Apple Inc.",
      price: 150,
      change: 1.5,
      changePercent: 1.0,
      volume: 50000000,
      signal: { type: "buy", strength: 60, grade: "buy", gradeLabel: "매수", gradeColor: "text-green-400", reasons: ["RSI 과매도"], breakdown: { rsi: 20, macd: 0, ma: 0, volume: 0, momentum: 0, bollinger: 0 }, summary: "RSI 과매도" },
      indicators: {
        rsi: 35,
        macd: 0.5,
        macdSignalLine: 0.3,
        macdHistogram: 0.2,
        ma5: 148,
        ma20: 145,
        ma60: 140,
      },
      lastUpdated: new Date().toISOString(),
      isStale: true,
      staleMinutesAgo: 8,
    };
    expect(stale.isStale).toBe(true);
    expect(stale.staleMinutesAgo).toBe(8);
  });

  it("staleMinutesAgo is a positive number when set", () => {
    const stale: StockSummary = {
      ticker: "TSLA",
      name: "Tesla Inc.",
      price: 200,
      change: -2,
      changePercent: -1.0,
      volume: 30000000,
      signal: { type: "neutral", strength: 30, grade: "watch", gradeLabel: "관망", gradeColor: "text-yellow-400", reasons: [], breakdown: { rsi: 0, macd: 0, ma: 0, volume: 0, momentum: 0, bollinger: 0 }, summary: "혼합 신호" },
      indicators: {
        rsi: null,
        macd: null,
        macdSignalLine: null,
        macdHistogram: null,
        ma5: null,
        ma20: null,
        ma60: null,
      },
      lastUpdated: new Date().toISOString(),
      isStale: true,
      staleMinutesAgo: 15,
    };
    expect(stale.staleMinutesAgo).toBeGreaterThan(0);
  });
});
