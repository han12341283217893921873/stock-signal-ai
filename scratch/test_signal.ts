import { generateSignal } from "../server/finnhub";

const mockCandles = Array.from({ length: 30 }, (_, i) => ({
  date: `2024-01-${i + 1}`,
  open: 100 + i,
  high: 110 + i,
  low: 95 + i,
  close: 105 + i,
  volume: 1000 + i * 100,
  rsi: 30 + i, // RSI starts low and increases
  macd: i * 0.1,
  macdSignal: i * 0.05,
  ma5: 100 + i,
  ma20: 95 + i,
  ma60: 90 + i,
  bbUpper: 115 + i,
  bbLower: 90 + i,
  momentum: 5 + i
}));

const mockFundamentals = {
  pe: 15,
  roe: 20,
  dividendYield: 2
};

const signal = generateSignal(mockCandles as any, mockFundamentals as any, [], {
  sentimentScore: 15, // Positive sentiment
  weeklyTrend: "bullish",
  marketGreedScore: 10
});

console.log("Generated Signal:", JSON.stringify(signal, null, 2));
