import { publicProcedure, router } from "../_core/trpc";
import {
  getGeneralNews,
  getQuote,
  getEconomicCalendar,
  getFearGreedIndex,
  cache,
} from "../finnhub";

export async function getMacroIndices() {
  const MACRO_TICKERS = [
    { ticker: "^GSPC", name: "S&P 500" },
    { ticker: "^KS11", name: "KOSPI" },
    { ticker: "^IXIC", name: "NASDAQ" },
    { ticker: "^TNX", name: "미국 10년물 국채" },
    { ticker: "KRW=X", name: "USD/KRW" },
    { ticker: "^VIX", name: "VIX 공포지수" },
  ];

  const results = await Promise.allSettled(
    MACRO_TICKERS.map(async ({ ticker, name }) => {
      const quote = await getQuote(ticker);
      return {
        ticker,
        name,
        price: (quote as any)?.regularMarketPrice ?? 0,
        change: (quote as any)?.regularMarketChange ?? 0,
        changePercent: (quote as any)?.regularMarketChangePercent ?? 0,
        currency: (quote as any)?.currency ?? "USD",
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map(r => r.value);
}

export async function getDailyBriefing() {
  const cacheKey = "dailyBriefing";
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const { invokeLLM } = await import("../_core/llm");
    const { getFearGreedIndex, getQuote, getGeneralNews } = await import(
      "../finnhub"
    );

    const today = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    // 병렬로 데이터 수집
    const [fg, spQuote, vixQuote, headlines] = await Promise.allSettled([
      getFearGreedIndex(),
      getQuote("^GSPC"),
      getQuote("^VIX"),
      getGeneralNews("general").then((n: any[]) =>
        n.slice(0, 8).map((i: any) => i.title)
      ),
    ]);

    const fgData =
      fg.status === "fulfilled" ? fg.value : { score: 50, label: "중립" };
    const sp = spQuote.status === "fulfilled" ? (spQuote.value as any) : null;
    const vix =
      vixQuote.status === "fulfilled"
        ? ((vixQuote.value as any)?.regularMarketPrice ?? 20)
        : 20;
    const news = headlines.status === "fulfilled" ? headlines.value : [];

    const prompt = `오늘은 ${today}입니다.

현재 시장 지표:
- S&P 500: ${sp?.regularMarketPrice?.toFixed(2) ?? "N/A"} (${sp?.regularMarketChangePercent?.toFixed(2) ?? 0}%)
- VIX 공포지수: ${Number(vix).toFixed(2)}
- 공포와 탐욕 지수: ${fgData.score}점 (${fgData.label})

오늘의 주요 뉴스 헤드라인:
${(news as string[]).map((h: string, i: number) => `${i + 1}. ${h}`).join("\n")}

위 데이터를 바탕으로 오늘의 주식 투자 브리핑을 작성해주세요.
반드시 JSON 형식으로만 응답하세요:
{
  "headline": "한 줄로 오늘 시장 분위기 (20자 이내)",
  "sentiment": "bullish" | "bearish" | "neutral",
  "keyPoints": ["주목할 점 1", "주목할 점 2", "주목할 점 3"],
  "watchTickers": ["오늘 주목할 티커1", "티커2", "티커3"],
  "riskLevel": "low" | "medium" | "high",
  "summary": "투자 전략 2~3문장 요약"
}`;

    const aiRes = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "당신은 베테랑 주식 시장 분석가입니다. 오늘의 시장 브리핑을 JSON으로 제공합니다.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const { parseJsonSafe } = await import("../_core/llm");
    const parsed = parseJsonSafe(aiRes.choices[0].message.content);
    const result = {
      ...parsed,
      generatedAt: new Date().toISOString(),
      today,
    };

    cache.set(cacheKey, result, 4 * 60 * 60 * 1000); // 4시간 캐시
    return result;
  } catch (err) {
    console.error("[DailyBriefing] Failed:", err);
    return null;
  }
}

export const macroRouter = router({
  /** 거시경제 지표 조회 (환율, 국채금리, 주요 지수) */
  indices: publicProcedure.query(async () => {
    return getMacroIndices();
  }),

  /** 시장 전체 뉴스 조회 */
  news: publicProcedure.query(async () => {
    const headlines = await getGeneralNews();
    return headlines;
  }),

  /** 경제 지표 캘린더 조회 */
  calendar: publicProcedure.query(async () => {
    return getEconomicCalendar();
  }),

  /** 공포와 탐욕 지수 조회 */
  fearGreed: publicProcedure.query(async () => {
    return getFearGreedIndex();
  }),

  /** 섹터 순환 분석 조회 - 1시간 캐시 */
  sectorRotation: publicProcedure.query(async () => {
    const { getHistoricalData, cache } = await import("../finnhub");
    const cacheKey = "sectorRotation";
    const cached = cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const SECTORS = [
      { ticker: "XLK", name: "Technology" },
      { ticker: "XLF", name: "Financials" },
      { ticker: "XLV", name: "Healthcare" },
      { ticker: "XLE", name: "Energy" },
      { ticker: "XLI", name: "Industrials" },
      { ticker: "XLP", name: "Staples" },
      { ticker: "XLY", name: "Discretionary" },
      { ticker: "XLB", name: "Materials" },
      { ticker: "XLU", name: "Utilities" },
      { ticker: "XLRE", name: "Real Estate" },
      { ticker: "XLC", name: "Communication" },
    ];

    const results = await Promise.allSettled(
      SECTORS.map(async ({ ticker, name }) => {
        const candles = await getHistoricalData(ticker, "3mo");
        if (!candles || candles.length < 2) return null;

        const latest = candles[candles.length - 1].close;
        const oneWeek = candles[Math.max(0, candles.length - 6)].close;
        const oneMonth = candles[Math.max(0, candles.length - 21)].close;
        const threeMonths = candles[0].close;

        return {
          sector: name,
          ticker,
          returns: {
            "1W": Number((((latest - oneWeek) / oneWeek) * 100).toFixed(2)),
            "1M": Number((((latest - oneMonth) / oneMonth) * 100).toFixed(2)),
            "3M": Number(
              (((latest - threeMonths) / threeMonths) * 100).toFixed(2)
            ),
            YTD: Number(
              (((latest - threeMonths) / threeMonths) * 100).toFixed(2)
            ), // Fix: YTD temporarily using 3M (should be since Jan 1st, but using 3M as approximation for now if 3mo data is all we fetch)
          },
        };
      })
    );

    const data = results
      .filter(
        (r): r is PromiseFulfilledResult<any> =>
          r.status === "fulfilled" && r.value !== null
      )
      .map(r => r.value);

    cache.set(cacheKey, data, 60 * 60 * 1000); // 1시간 캐시
    return data;
  }),

  /** 시장 컨텍스트 요약 (종목 상세 페이지용) */
  marketContext: publicProcedure.query(async () => {
    const [fearGreed, vixQuote, sp500Quote] = await Promise.all([
      getFearGreedIndex(),
      getQuote("^VIX"),
      getQuote("^GSPC"),
    ]);

    return {
      fearGreed,
      vix: (vixQuote as any)?.regularMarketPrice ?? 0,
      vixChange: (vixQuote as any)?.regularMarketChangePercent ?? 0,
      sp500Change: (sp500Quote as any)?.regularMarketChangePercent ?? 0,
    };
  }),

  /** 전 세계 섹터 히트맵 데이터 */
  sectorHeatmap: publicProcedure.query(async () => {
    const { getYahooTopMovers, getYahooKRTopMovers } = await import("../yahoo");
    const cacheKey = "globalSectorHeatmap";
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      // 미국 및 한국 상위 종목 수집
      const [usMovers, krMovers] = await Promise.all([
        getYahooTopMovers().catch(() => []),
        getYahooKRTopMovers().catch(() => []),
      ]);

      const allStocks = [
        ...(Array.isArray(usMovers) ? usMovers : usMovers.gainers || []),
        ...(Array.isArray(krMovers) ? krMovers : krMovers.gainers || []),
      ];
      const sectorGroups: Record<
        string,
        { totalChange: number; count: number; stocks: any[] }
      > = {};

      allStocks.forEach(s => {
        const sector =
          (s as any).sector || (s as any).finnhubIndustry || "Others";
        if (!sectorGroups[sector]) {
          sectorGroups[sector] = { totalChange: 0, count: 0, stocks: [] };
        }
        sectorGroups[sector].totalChange += s.changePercent || 0;
        sectorGroups[sector].count += 1;
        if (sectorGroups[sector].stocks.length < 5) {
          sectorGroups[sector].stocks.push({
            ticker: s.ticker,
            change: s.changePercent,
          });
        }
      });

      const heatmap = Object.entries(sectorGroups)
        .map(([name, data]) => ({
          name,
          value: data.totalChange / data.count,
          count: data.count,
          topStocks: data.stocks,
        }))
        .sort((a, b) => b.value - a.value);

      cache.set(cacheKey, heatmap, 30 * 60 * 1000); // 30분 캐시
      return heatmap;
    } catch (err) {
      console.error("[SectorHeatmap] Failed:", err);
      return [];
    }
  }),

  /** 글로벌 매크로 펄스 (환율, 금리, 원자재 등) */
  pulse: publicProcedure.query(async () => {
    const { getQuote } = await import("../yahoo");
    const { invokeLLM } = await import("../_core/llm");
    const cacheKey = "macroPulse";
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      // 핵심 지표 수집
      const tickers = {
        exchangeRate: "USDKRW=X",
        us10yYield: "^TNX",
        gold: "GC=F",
        crudeOil: "CL=F",
        bitcoin: "BTC-USD",
        nasdaq: "^IXIC",
        kospi: "^KS11",
      };

      const results = await Promise.all(
        Object.entries(tickers).map(async ([key, t]) => {
          const q = await getQuote(t).catch(() => null);
          return {
            key,
            symbol: t,
            price: q?.regularMarketPrice ?? 0,
            change: q?.regularMarketChangePercent ?? 0,
          };
        })
      );

      const indicators = results.reduce((acc, curr) => {
        acc[curr.key] = curr;
        return acc;
      }, {} as any);

      // AI 매크로 해석
      const prompt = `글로벌 매크로 지표 분석:
        - 환율(USD/KRW): ${indicators.exchangeRate.price} (${indicators.exchangeRate.change.toFixed(2)}%)
        - 미국 10년물 금리: ${indicators.us10yYield.price}%
        - 금: ${indicators.gold.price}
        - 원유: ${indicators.crudeOil.price}
        - 비트코인: ${indicators.bitcoin.price}
        - 나스닥: ${indicators.nasdaq.change.toFixed(2)}%
        - 코스피: ${indicators.kospi.change.toFixed(2)}%

        위 지표들을 바탕으로 현재 시장의 리스크 수준(1~100)을 산출하고, 
        주식 투자자가 주의해야 할 핵심 포인트를 2문장으로 요약해주세요. 
        반드시 JSON 형식으로만 응답하세요: { "riskScore": number, "summary": string, "sentiment": "bullish" | "bearish" | "neutral" }`;

      const aiResponse = await invokeLLM({
        messages: [
          { role: "system", content: "금융 매크로 분석가입니다." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const { parseJsonSafe } = await import("../_core/llm");
      const parsed = parseJsonSafe(aiResponse.choices[0].message.content);

      const pulseData = {
        indicators,
        aiInsight: parsed,
        timestamp: new Date().toISOString(),
      };

      cache.set(cacheKey, pulseData, 15 * 60 * 1000); // 15분 캐시
      return pulseData;
    } catch (err) {
      console.error("[MacroPulse] Failed:", err);
      return null;
    }
  }),

  /** 글로벌 지수 데이터 (Feature 46) */
  globalIndices: publicProcedure.query(async () => {
    const { getGlobalIndices } = await import("../finnhub");
    return getGlobalIndices();
  }),

  /** 📋 일일 AI 시장 브리핑 — 4시간 캐시 */
  dailyBriefing: publicProcedure.query(async () => {
    return getDailyBriefing();
  }),

  /** AI 감성 히트맵 (섹터별 투자 심리) */
  sentimentHeatmap: publicProcedure.query(async () => {
    const { getScanCache } = await import("../scanner");
    const cacheKey = "sentimentHeatmap";
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    // 1. 스캔 데이터 가져오기 (가장 최근 것)
    const scanUs = getScanCache("us");
    const scanKr = getScanCache("kr");
    const allResults = [...scanUs.results, ...scanKr.results];

    if (allResults.length === 0) return [];

    // 2. 섹터별 점수 합산
    const sectorStats: Record<string, { score: number; count: number; symbols: string[] }> = {};
    
    allResults.forEach(r => {
      const sector = r.sector || "Others";
      if (!sectorStats[sector]) {
        sectorStats[sector] = { score: 0, count: 0, symbols: [] };
      }
      
      // 신호 유형에 따른 가중치
      let s = 50; // 기본
      if (r.signalType === "buy") s = 70 + (r.signalStrength / 10);
      if (r.signalType === "sell") s = 30 - (r.signalStrength / 10);
      
      sectorStats[sector].score += s;
      sectorStats[sector].count += 1;
      if (sectorStats[sector].symbols.length < 3) {
        sectorStats[sector].symbols.push(r.ticker);
      }
    });

    const heatmap = Object.entries(sectorStats).map(([name, data]) => ({
      name,
      value: Number((data.score / data.count).toFixed(1)),
      count: data.count,
      topStocks: data.symbols,
    })).sort((a, b) => b.value - a.value);

    cache.set(cacheKey, heatmap, 1 * 60 * 60 * 1000); // 1시간 캐시
    return heatmap;
  }),
});
