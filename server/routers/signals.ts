import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getSignalHistory,
  addSignalHistory,
  markSignalAsRead,
  markAllSignalsAsRead,
  getUnreadSignalCount,
} from "../db";
import { getHistoricalData, generateSignal } from "../finnhub";

export const signalsRouter = router({
  list: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(200).default(50) }).optional()
    )
    .query(async ({ ctx, input }) => {
      return getSignalHistory(ctx.user.id, input?.limit ?? 50);
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return getUnreadSignalCount(ctx.user.id);
  }),

  markRead: protectedProcedure
    .input(z.object({ signalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markSignalAsRead(ctx.user.id, input.signalId);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllSignalsAsRead(ctx.user.id);
    return { success: true };
  }),

  /** 특정 종목에 대한 신호 생성 + 저장 (AI 컨텍스트 통합) */
  generate: protectedProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const { 
        getHistoricalData, 
        generateSignal, 
        getBasicFinancials, 
        getCompanyNews, 
        getFearGreedIndex,
        getHistoricalDataWithResolution
      } = await import("../finnhub");
      
      const ticker = input.ticker.toUpperCase();
      
      // 1. 데이터 병렬 Fetch
      const [candles, fundamentals, news, fearGreed] = await Promise.all([
        getHistoricalData(ticker, "6mo"),
        getBasicFinancials(ticker),
        getCompanyNews(ticker, 7),
        getFearGreedIndex()
      ]);

      // 2. 주봉 추세 분석 (Multi-timeframe)
      let weeklyTrend: "bullish" | "bearish" | "neutral" = "neutral";
      try {
        const weeklyCandles = await getHistoricalDataWithResolution(ticker, "1wk", "3mo");
        if (weeklyCandles.length >= 2) {
          const lastW = weeklyCandles[weeklyCandles.length - 1];
          const prevW = weeklyCandles[weeklyCandles.length - 2];
          if (lastW.close > prevW.close) weeklyTrend = "bullish";
          else if (lastW.close < prevW.close) weeklyTrend = "bearish";
        }
      } catch (e) {
        console.warn(`[Signals] Failed to fetch weekly trend for ${ticker}`);
      }

      // 3. 뉴스 감성 분석 (단순 키워드 기반 근사치 계산)
      let sentimentScore = 0;
      if (news.length > 0) {
        const positiveKeywords = ["buy", "growth", "surpass", "positive", "strong", "win", "high", "upgrade", "호재", "상승", "수익", "성장"];
        const negativeKeywords = ["sell", "drop", "negative", "weak", "loss", "low", "downgrade", "warn", "악재", "하락", "손실", "부진"];
        
        let posCount = 0;
        let negCount = 0;
        news.forEach(n => {
          const text = n.title.toLowerCase();
          positiveKeywords.forEach(k => { if (text.includes(k)) posCount++; });
          negativeKeywords.forEach(k => { if (text.includes(k)) negCount++; });
        });
        sentimentScore = (posCount - negCount) * 2; // -20 ~ +20 범위 근사
      }

      // 4. 종합 신호 생성
      const signal = generateSignal(candles, fundamentals, [], {
        sentimentScore,
        weeklyTrend,
        marketGreedScore: fearGreed.score - 50, // -50 ~ +50
      });

      const latest = candles.length > 0 ? candles[candles.length - 1] : null;

      await addSignalHistory({
        userId: ctx.user.id,
        ticker,
        signalType: signal.type,
        strength: signal.strength,
        price: latest?.close ?? 0,
        rsi: latest?.rsi ?? null,
        macdSignal: signal.type,
        reason: signal.reasons.join(" | "),
      });

      return signal;
    }),
});
