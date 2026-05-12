import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getHistoricalData } from "../finnhub";
import { runBacktest, runGridSearch } from "../backtest";
import type { BacktestStrategy, OptimizeParams } from "../backtest";

export const backtestRouter = router({
  run: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        period: z.enum(["3mo", "6mo", "1y", "2y"]).default("1y"),
        strategyType: z.enum([
          "rsi",
          "macd",
          "ma_cross",
          "combined",
          "bollinger",
        ]),
        params: z
          .object({
            rsiBuyThreshold: z.number().min(1).max(99).optional(),
            rsiSellThreshold: z.number().min(1).max(99).optional(),
            maFastPeriod: z.number().min(2).max(50).optional(),
            maSlowPeriod: z.number().min(5).max(200).optional(),
            bbPeriod: z.number().min(5).max(50).optional(),
            bbStdDev: z.number().min(0.5).max(4).optional(),
            initialCapital: z.number().min(100).max(10000000).optional(),
            positionSize: z.number().min(1).max(100).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const candles = await getHistoricalData(ticker, input.period);

      const strategyNames: Record<string, string> = {
        rsi: "RSI 전략",
        macd: "MACD 전략",
        ma_cross: "이동평균선 크로스 전략",
        combined: "복합 전략",
      };

      const strategy: BacktestStrategy = {
        name: strategyNames[input.strategyType] || input.strategyType,
        type: input.strategyType,
        params: input.params ?? {},
      };

      return runBacktest(candles, strategy, ticker, input.period);
    }),

  /** 파라미터 자동 최적화 (그리드 서치) */
  optimize: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        period: z.enum(["3mo", "6mo", "1y", "2y"]).default("1y"),
        strategyType: z
          .enum(["rsi", "macd", "ma_cross", "combined", "bollinger", "all"])
          .default("all"),
        objective: z
          .enum(["totalReturn", "winRate", "sharpeRatio"])
          .default("totalReturn"),
        topN: z.number().int().min(1).max(10).default(5),
      })
    )
    .mutation(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const candles = await getHistoricalData(ticker, input.period);
      if (candles.length < 30) {
        throw new Error("데이터가 부족합니다. 더 긴 기간을 선택해주세요.");
      }
      const opts: OptimizeParams = {
        strategyType: input.strategyType,
        objective: input.objective,
        topN: input.topN,
      };
      return runGridSearch(candles, ticker, input.period, opts);
    }),
});
