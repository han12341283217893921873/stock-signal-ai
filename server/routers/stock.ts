import { publicProcedure, router } from "../_core/trpc.js";
import { z } from "zod";
import {
  getStockSummary,
  getHistoricalData,
  getQuote,
  searchTicker,
  getTopMovers,
  getKRTopMovers,
  getOpenMarketName,
  isAnyMarketOpen,
  getCompanyNews,
  getBasicFinancials,
} from "../finnhub.js";

export const stockRouter = router({
  /** 종목 요약 정보 (시세 + 지표 + 신호) */
  summary: publicProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const [summary, fundamentals] = await Promise.all([
        getStockSummary(ticker),
        getBasicFinancials(ticker),
      ]);
      return { ...summary, fundamentals };
    }),

  /** 종목 과거 데이터 + 기술적 지표 (차트용) */
  history: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        period: z.enum(["1mo", "3mo", "6mo", "1y", "2y"]).default("6mo"),
      })
    )
    .query(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      let candles = await getHistoricalData(ticker, input.period);
      // 실시간 quote로 오늘 캔들 보완
      try {
        const quote = await getQuote(ticker);
        const livePrice: number = (quote as any)?.regularMarketPrice ?? 0;
        if (livePrice > 0) {
          const todayStr = new Date().toISOString().split("T")[0];
          const lastDate =
            candles.length > 0
              ? new Date(candles[candles.length - 1].date)
                  .toISOString()
                  .split("T")[0]
              : "";
          if (lastDate !== todayStr) {
            candles = [
              ...candles,
              {
                date: new Date().toISOString(),
                open: (quote as any)?.regularMarketOpen ?? livePrice,
                high: (quote as any)?.regularMarketDayHigh ?? livePrice,
                low: (quote as any)?.regularMarketDayLow ?? livePrice,
                close: livePrice,
                volume: (quote as any)?.regularMarketVolume ?? 0,
              },
            ];
          } else {
            const lastIdx = candles.length - 1;
            candles = [
              ...candles.slice(0, lastIdx),
              {
                ...candles[lastIdx],
                close: livePrice,
                high: Math.max(candles[lastIdx].high, livePrice),
                low: Math.min(candles[lastIdx].low, livePrice),
                volume:
                  (quote as any)?.regularMarketVolume ??
                  candles[lastIdx].volume,
              },
            ];
          }
        }
      } catch {
        /* quote 실패 시 원본 데이터 반환 */
      }
      return candles;
    }),

  /** 종목 검색 */
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      return searchTicker(input.query);
    }),

  /** 여러 종목 요약 일괄 조회 */
  batchSummary: publicProcedure
    .input(z.object({ tickers: z.array(z.string()).max(20) }))
    .query(async ({ input }) => {
      const promises = input.tickers.map(async ticker => {
        try {
          return await getStockSummary(ticker.toUpperCase());
        } catch (err) {
          console.error(`[BatchSummary] Failed for ${ticker}:`, err);
          return null;
        }
      });
      const results = await Promise.all(promises);
      return results.filter(r => r !== null);
    }),

  /** 실시간 상승/하락 주식 순위 (Top 10) */
  topMovers: publicProcedure
    .input(z.object({ market: z.enum(["US", "KR"]).default("US") }).optional())
    .query(async ({ input }) => {
      const market = input?.market ?? "US";
      if (market === "KR") return getKRTopMovers();
      return getTopMovers();
    }),

  /** 장 개장 상태 반환 */
  marketStatus: publicProcedure.query(() => {
    const openMarket = getOpenMarketName();
    let nextOpen: string | null = null;
    if (!openMarket) {
      const now = new Date();
      const utcH = now.getUTCHours();
      const utcM = now.getUTCMinutes();
      const total = utcH * 60 + utcM;
      if (total < 6 * 60 + 30) {
        nextOpen = "한국 장 09:00 KST";
      } else if (total < 13 * 60 + 30) {
        nextOpen = "미국 장 22:30 KST";
      } else {
        nextOpen = "한국 장 내일 09:00 KST";
      }
    }
    return {
      isOpen: isAnyMarketOpen(),
      market: openMarket,
      label:
        openMarket === "US"
          ? "미국 장 개장 중"
          : openMarket === "KR"
            ? "한국 장 개장 중"
            : "장 마감",
      nextOpen,
    };
  }),

  /** 종목 상관관계 분석 (Feature 20) */
  correlation: publicProcedure
    .input(
      z.object({ ticker: z.string(), benchmark: z.string().default("^IXIC") })
    )
    .query(async ({ input }) => {
      const { getHistoricalData } = await import("../finnhub");
      const ticker = input.ticker.toUpperCase();
      const benchmark = input.benchmark.toUpperCase();

      const [stockHistory, benchHistory] = await Promise.all([
        getHistoricalData(ticker, "6mo"),
        getHistoricalData(benchmark, "6mo"),
      ]);

      const commonDates = stockHistory.filter(s =>
        benchHistory.some(b => b.date === s.date)
      );
      const filteredBench = benchHistory.filter(b =>
        stockHistory.some(s => s.date === b.date)
      );

      const stockReturns = commonDates.slice(-30).map((s, i) => {
        if (i === 0) return 0;
        return (s.close - commonDates[i - 1].close) / commonDates[i - 1].close;
      });
      const benchReturns = filteredBench.slice(-30).map((b, i) => {
        if (i === 0) return 0;
        return (
          (b.close - filteredBench[i - 1].close) / filteredBench[i - 1].close
        );
      });

      const n = Math.min(stockReturns.length, benchReturns.length);
      const sR = stockReturns.slice(-n);
      const bR = benchReturns.slice(-n);

      const meanX = sR.reduce((a, b) => a + b, 0) / n;
      const meanY = bR.reduce((a, b) => a + b, 0) / n;

      let num = 0;
      let denX = 0;
      let denY = 0;

      for (let i = 0; i < n; i++) {
        const dx = sR[i] - meanX;
        const dy = bR[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }

      const correlation = denX && denY ? num / Math.sqrt(denX * denY) : 0;
      const beta = denY ? num / denY : 1;

      return {
        benchmark,
        correlation: Number(correlation.toFixed(3)),
        beta: Number(beta.toFixed(2)),
        period: "30D",
      };
    }),

  /** 계절성 분석 (Feature 41) */
  seasonalAnalysis: publicProcedure
    .input(z.object({ ticker: z.string() }))
    .query(async ({ input }) => {
      const { getHistoricalData } = await import("../finnhub");
      const ticker = input.ticker.toUpperCase();
      // 5년치 데이터 (가능한 경우)
      const candles = await getHistoricalData(ticker, "2y");

      const monthlyStats: Record<number, { returns: number[]; win: number }> =
        {};
      for (let i = 1; i < candles.length; i++) {
        const date = new Date(candles[i].date);
        const month = date.getMonth();
        const prevDate = new Date(candles[i - 1].date);

        // 월초 대비 월말 수익률 계산 (단순화: 일별 수익률 합산)
        const ret =
          (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
        if (!monthlyStats[month]) monthlyStats[month] = { returns: [], win: 0 };
        monthlyStats[month].returns.push(ret);
      }

      return Object.entries(monthlyStats)
        .map(([month, stats]) => {
          const avgReturn =
            stats.returns.reduce((a, b) => a + b, 0) / stats.returns.length;
          const winRate =
            (stats.returns.filter(r => r > 0).length / stats.returns.length) *
            100;
          return {
            month: Number(month) + 1,
            avgReturn: Number((avgReturn * 100).toFixed(2)),
            winRate: Number(winRate.toFixed(1)),
            sampleSize: stats.returns.length,
          };
        })
        .sort((a, b) => a.month - b.month);
    }),

  /** 내부자 거래 분석 (Feature 42) */
  insiderTracking: publicProcedure
    .input(z.object({ ticker: z.string() }))
    .query(async ({ input }) => {
      const { getInsiderTransactions } = await import("../finnhub");
      const ticker = input.ticker.toUpperCase();
      const transactions = await getInsiderTransactions(ticker);

      const recent = transactions.slice(0, 20);
      let netShares = 0;
      recent.forEach(t => {
        if (t.transactionCode === "P") netShares += t.share; // Purchase
        if (t.transactionCode === "S") netShares -= t.share; // Sale
      });

      return {
        recent,
        sentiment:
          netShares > 0 ? "Bullish" : netShares < 0 ? "Bearish" : "Neutral",
        netShares,
        lastUpdated: new Date(),
      };
    }),

  /** 갭 분석 (Feature 43) */
  gapAnalysis: publicProcedure
    .input(z.object({ ticker: z.string() }))
    .query(async ({ input }) => {
      const { getHistoricalData } = await import("../finnhub");
      const ticker = input.ticker.toUpperCase();
      const candles = await getHistoricalData(ticker, "1mo");

      if (candles.length < 2) return null;

      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];
      const gap = ((last.open - prev.close) / prev.close) * 100;

      // 역사적 갭 필 확률 (단순화: 70%)
      const fillProbability = Math.abs(gap) > 1 ? 65 : 40;

      return {
        gapPercent: Number(gap.toFixed(2)),
        type: gap > 0 ? "Gap Up" : gap < 0 ? "Gap Down" : "No Gap",
        fillProbability,
        strategy:
          gap > 0 ? "갭 하단 지지 확인 후 진입" : "갭 상단 저항 확인 후 매도",
      };
    }),

  /** 고래 흐름 분석 (Feature 40) */
  whaleFlow: publicProcedure
    .input(z.object({ ticker: z.string() }))
    .query(async ({ input }) => {
      const { getHistoricalData } = await import("../finnhub");
      const ticker = input.ticker.toUpperCase();
      const candles = await getHistoricalData(ticker, "1mo");

      const avgVolume =
        candles.reduce((a, b) => a + b.volume, 0) / candles.length;
      const whaleActivities = candles
        .filter(c => c.volume > avgVolume * 2) // 평균 거래량 2배 이상
        .map(c => ({
          date: c.date,
          volumeMultiplier: (c.volume / avgVolume).toFixed(1),
          priceChange: (((c.close - c.open) / c.open) * 100).toFixed(2),
          type:
            c.close > c.open ? "Accumulation (매집)" : "Distribution (분산)",
        }));

      return {
        avgVolume,
        activities: whaleActivities.slice(-5),
        sentiment:
          whaleActivities.filter(a => a.type.includes("Accumulation")).length >
          whaleActivities.filter(a => a.type.includes("Distribution")).length
            ? "Bullish"
            : "Bearish",
      };
    }),
});
