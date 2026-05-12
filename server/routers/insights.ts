import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getQuote,
  getBasicFinancials,
  getCompanyNews,
  getDividends,
  getHistoricalData,
  cache,
} from "../finnhub";
import { invokeLLM } from "../_core/llm";
import { getPortfolioPositions } from "../db";

async function getPositions(userId: string | number) {
  return getPortfolioPositions(Number(userId));
}

export const insightsRouter = router({
  // ── 1. 실적 발표 캘린더 ──────────────────────────────────────
  earningsCalendar: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = `earnings_calendar_${ctx.user.id}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    const positions = await getPositions(ctx.user.id);
    const tickers = positions
      .map(p => p.ticker)
      .filter(t => !t.includes(".KS") && !t.includes(".KQ"))
      .slice(0, 10);
    const results: any[] = [];

    for (const ticker of tickers) {
      try {
        const { finnhubClient } = await import("../finnhub");
        const resp = await finnhubClient.get("/stock/earnings", {
          params: {
            symbol: ticker,
            token: process.env.FINNHUB_API_KEY,
            limit: 4,
          },
        });
        const earnings = Array.isArray(resp.data) ? resp.data : [];
        if (earnings.length > 0) {
          results.push({ ticker, ...earnings[0] });
        }
      } catch {
        /* skip */
      }
    }

    // 날짜순 정렬
    results.sort(
      (a, b) =>
        new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
    );
    const result = { upcoming: results, updatedAt: new Date() };
    cache.set(cacheKey, result, 60 * 60 * 1000);
    return result;
  }),

  // ── 2. 배당 추적기 ─────────────────────────────────────────
  dividendTracker: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = `dividend_tracker_${ctx.user.id}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    const positions = await getPositions(ctx.user.id);
    const results: any[] = [];
    let totalAnnualDividend = 0;

    for (const pos of positions) {
      try {
        const [quote, dividends, fundamentals] = await Promise.all([
          getQuote(pos.ticker),
          getDividends(pos.ticker),
          getBasicFinancials(pos.ticker),
        ]);
        const price = (quote as any)?.regularMarketPrice || 0;
        const divYield = fundamentals?.dividendYield || 0;
        const annualDiv = ((price * divYield) / 100) * Number(pos.quantity);
        totalAnnualDividend += annualDiv;
        const lastDiv = dividends[0];
        results.push({
          ticker: pos.ticker,
          quantity: Number(pos.quantity),
          price,
          dividendYield: divYield,
          annualDividendPerShare: (price * divYield) / 100,
          annualDividendTotal: annualDiv,
          lastExDate: lastDiv?.exDate,
          lastAmount: lastDiv?.amount,
          payDate: lastDiv?.payDate,
          frequency:
            dividends.length >= 4
              ? "분기"
              : dividends.length >= 12
                ? "월배당"
                : "연간",
        });
      } catch {
        /* skip */
      }
    }

    results.sort((a, b) => b.dividendYield - a.dividendYield);
    const result = {
      positions: results,
      totalAnnualDividend,
      updatedAt: new Date(),
    };
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  }),

  // ── 3. 리밸런싱 도구 ──────────────────────────────────────
  rebalancing: protectedProcedure
    .input(
      z.object({
        targets: z.array(
          z.object({ ticker: z.string(), targetPct: z.number() })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const positions = await getPositions(ctx.user.id);
      let totalValue = 0;
      const current: Record<
        string,
        { value: number; quantity: number; price: number }
      > = {};

      for (const pos of positions) {
        try {
          const q = await getQuote(pos.ticker);
          const price = (q as any)?.regularMarketPrice || Number(pos.avgPrice);
          const value = price * Number(pos.quantity);
          totalValue += value;
          current[pos.ticker] = {
            value,
            quantity: Number(pos.quantity),
            price,
          };
        } catch {
          /* skip */
        }
      }

      const actions = input.targets.map(t => {
        const cur = current[t.ticker] || { value: 0, quantity: 0, price: 0 };
        const targetValue = (totalValue * t.targetPct) / 100;
        const diff = targetValue - cur.value;
        const shares = cur.price > 0 ? Math.round(diff / cur.price) : 0;
        return {
          ticker: t.ticker,
          targetPct: t.targetPct,
          currentPct: totalValue > 0 ? (cur.value / totalValue) * 100 : 0,
          currentValue: cur.value,
          targetValue,
          diff,
          action: diff > 0 ? "BUY" : diff < 0 ? "SELL" : "HOLD",
          shares: Math.abs(shares),
          price: cur.price,
        };
      });

      return { actions, totalValue, analyzedAt: new Date() };
    }),

  // ── 4. AI 일일 브리핑 ─────────────────────────────────────
  dailyBriefing: publicProcedure.query(async () => {
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `daily_briefing_${today}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const { getGlobalIndices, getFearGreedIndex } = await import(
        "../finnhub"
      );
      const [indices, fearGreed] = await Promise.all([
        getGlobalIndices(),
        getFearGreedIndex(),
      ]);

      const marketSummary = indices
        .slice(0, 5)
        .map(
          (i: any) =>
            `${i.name}: ${i.price?.toLocaleString()} (${i.changePercent >= 0 ? "+" : ""}${i.changePercent?.toFixed(2)}%)`
        )
        .join(", ");

      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "당신은 월스트리트 수석 시장 분석가입니다. 한국어로 간결하게 응답하세요.",
          },
          {
            role: "user",
            content: `오늘(${today}) 시장 현황: ${marketSummary}. 공포탐욕지수: ${fearGreed.score} (${fearGreed.label}). 이를 바탕으로 오늘의 시장 브리핑을 3문장으로 요약해주세요. 핵심 리스크와 기회를 포함하세요.`,
          },
        ],
      });

      const result = {
        date: today,
        briefing: resp.choices[0].message.content,
        indices: indices.slice(0, 5),
        fearGreed,
        generatedAt: new Date(),
      };
      cache.set(cacheKey, result, 4 * 60 * 60 * 1000); // 4시간
      return result;
    } catch {
      return {
        date: today,
        briefing: "시장 브리핑을 불러오는 중입니다...",
        indices: [],
        fearGreed: { score: 50, label: "Neutral" },
        generatedAt: new Date(),
      };
    }
  }),

  // ── 5. 손익분기점 계산기 ──────────────────────────────────
  breakeven: protectedProcedure.query(async ({ ctx }) => {
    const positions = await getPositions(ctx.user.id);
    const results: any[] = [];

    for (const pos of positions) {
      try {
        const q = await getQuote(pos.ticker);
        const currentPrice = (q as any)?.regularMarketPrice || 0;
        const avgPrice = Number(pos.avgPrice);
        const quantity = Number(pos.quantity);
        const pnlPct =
          avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
        const pnl = (currentPrice - avgPrice) * quantity;
        const targetPrices = [10, 20, 30, 50].map(pct => ({
          pct,
          price: avgPrice * (1 + pct / 100),
          gain: avgPrice * (pct / 100) * quantity,
        }));
        results.push({
          ticker: pos.ticker,
          avgPrice,
          currentPrice,
          quantity,
          pnl,
          pnlPct,
          breakevenPrice: avgPrice,
          distToBreakeven:
            currentPrice > 0
              ? ((avgPrice - currentPrice) / currentPrice) * 100
              : 0,
          targetPrices,
          stopLoss5: avgPrice * 0.95,
          stopLoss10: avgPrice * 0.9,
        });
      } catch {
        /* skip */
      }
    }

    return {
      positions: results.sort((a, b) => a.pnlPct - b.pnlPct),
      analyzedAt: new Date(),
    };
  }),

  // ── 6. 절세 전략 (Tax-Loss Harvesting) ─────────────────────
  taxLossHarvesting: protectedProcedure.query(async ({ ctx }) => {
    const positions = await getPositions(ctx.user.id);
    const losers: any[] = [];
    const winners: any[] = [];
    let totalRealizedLoss = 0;
    let totalRealizedGain = 0;

    for (const pos of positions) {
      try {
        const q = await getQuote(pos.ticker);
        const price = (q as any)?.regularMarketPrice || 0;
        const avg = Number(pos.avgPrice);
        const qty = Number(pos.quantity);
        const pnl = (price - avg) * qty;
        const pnlPct = avg > 0 ? ((price - avg) / avg) * 100 : 0;
        if (pnl < 0) {
          losers.push({ ticker: pos.ticker, pnl, pnlPct, price, avg, qty });
          totalRealizedLoss += Math.abs(pnl);
        } else {
          winners.push({ ticker: pos.ticker, pnl, pnlPct, price, avg, qty });
          totalRealizedGain += pnl;
        }
      } catch {
        /* skip */
      }
    }

    const netHarvestable = Math.min(totalRealizedLoss, totalRealizedGain);
    const taxSaving = netHarvestable * 0.22; // 22% 세율

    return {
      losers: losers.sort((a, b) => a.pnl - b.pnl),
      winners: winners.sort((a, b) => b.pnl - a.pnl),
      totalRealizedLoss,
      totalRealizedGain,
      netHarvestable,
      estimatedTaxSaving: taxSaving,
      analyzedAt: new Date(),
    };
  }),

  // ── 7. 옵션 흐름 추적 ─────────────────────────────────────
  optionsFlow: publicProcedure
    .input(z.object({ ticker: z.string().default("SPY") }))
    .query(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const cacheKey = `options_flow_${ticker}`;
      const cached = cache.get<any>(cacheKey);
      if (cached) return cached;

      try {
        // Finnhub 옵션 체인 조회
        const { finnhubClient } = await import("../finnhub");
        const resp = await finnhubClient.get("/stock/option-chain", {
          params: { symbol: ticker, token: process.env.FINNHUB_API_KEY },
        });
        const data = resp.data?.data || [];

        // 거래량 상위 옵션 필터링
        const unusual: any[] = [];
        for (const expiry of data.slice(0, 3)) {
          for (const opt of [
            ...(expiry.options?.CALL || []),
            ...(expiry.options?.PUT || []),
          ]) {
            if (opt.volume > 1000 && opt.openInterest > 0) {
              unusual.push({
                ticker,
                type: expiry.options?.CALL?.includes(opt) ? "CALL" : "PUT",
                strike: opt.strike,
                expiry: expiry.expirationDate,
                volume: opt.volume,
                openInterest: opt.openInterest,
                impliedVolatility: opt.impliedVolatility,
                volOIRatio: opt.volume / Math.max(opt.openInterest, 1),
              });
            }
          }
        }
        unusual.sort((a, b) => b.volOIRatio - a.volOIRatio);

        const calls = unusual.filter(o => o.type === "CALL").slice(0, 5);
        const puts = unusual.filter(o => o.type === "PUT").slice(0, 5);
        const sentiment =
          calls.length > puts.length
            ? "Bullish"
            : calls.length < puts.length
              ? "Bearish"
              : "Neutral";

        const result = {
          ticker,
          unusual: unusual.slice(0, 10),
          calls,
          puts,
          sentiment,
          updatedAt: new Date(),
        };
        cache.set(cacheKey, result, 15 * 60 * 1000);
        return result;
      } catch {
        return {
          ticker,
          unusual: [],
          calls: [],
          puts: [],
          sentiment: "Neutral",
          updatedAt: new Date(),
        };
      }
    }),

  // ── 8. 섹터 히트맵 데이터 ─────────────────────────────────
  sectorHeatmap: publicProcedure.query(async () => {
    const cacheKey = "sector_heatmap_full";
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    const SECTORS = [
      {
        name: "Technology",
        etf: "XLK",
        stocks: ["AAPL", "MSFT", "NVDA", "AVGO", "ORCL"],
      },
      {
        name: "Healthcare",
        etf: "XLV",
        stocks: ["LLY", "UNH", "JNJ", "MRK", "ABBV"],
      },
      {
        name: "Financials",
        etf: "XLF",
        stocks: ["BRK-B", "JPM", "V", "MA", "BAC"],
      },
      {
        name: "Consumer Disc.",
        etf: "XLY",
        stocks: ["AMZN", "TSLA", "HD", "MCD", "NKE"],
      },
      {
        name: "Communication",
        etf: "XLC",
        stocks: ["META", "GOOGL", "NFLX", "DIS", "T"],
      },
      {
        name: "Industrials",
        etf: "XLI",
        stocks: ["CAT", "GE", "HON", "UPS", "RTX"],
      },
      {
        name: "Energy",
        etf: "XLE",
        stocks: ["XOM", "CVX", "COP", "SLB", "EOG"],
      },
      {
        name: "Utilities",
        etf: "XLU",
        stocks: ["NEE", "DUK", "SO", "AEP", "D"],
      },
      {
        name: "Materials",
        etf: "XLB",
        stocks: ["LIN", "APD", "ECL", "NEM", "FCX"],
      },
      {
        name: "Real Estate",
        etf: "XLRE",
        stocks: ["PLD", "AMT", "CCI", "EQIX", "SPG"],
      },
      {
        name: "Cons. Staples",
        etf: "XLP",
        stocks: ["PG", "KO", "PEP", "COST", "WMT"],
      },
    ];

    const results = await Promise.all(
      SECTORS.map(async sector => {
        try {
          const q = await getQuote(sector.etf);
          const change = (q as any)?.regularMarketChangePercent || 0;

          // 개별 종목도 조회
          const stockData = await Promise.all(
            sector.stocks.slice(0, 3).map(async ticker => {
              try {
                const sq = await getQuote(ticker);
                return {
                  ticker,
                  change: (sq as any)?.regularMarketChangePercent || 0,
                  price: (sq as any)?.regularMarketPrice || 0,
                };
              } catch {
                return { ticker, change: 0, price: 0 };
              }
            })
          );

          return { ...sector, change, stockData };
        } catch {
          return { ...sector, change: 0, stockData: [] };
        }
      })
    );

    const result = {
      sectors: results.sort((a, b) => b.change - a.change),
      updatedAt: new Date(),
    };
    cache.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  }),

  // ── 9. 매매 메모 저장 (localStorage 기반 - 클라이언트 전용) ─
  // 서버는 필요없음, 클라이언트에서 localStorage 사용

  // ── 10. AI 투자 플랜 생성 ─────────────────────────────────
  investmentPlan: protectedProcedure
    .input(
      z.object({
        riskTolerance: z.enum(["conservative", "moderate", "aggressive"]),
        investmentGoal: z.enum([
          "growth",
          "income",
          "preservation",
          "balanced",
        ]),
        timeHorizon: z.enum(["short", "mid", "long"]),
        monthlyBudget: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const positions = await getPositions(ctx.user.id);
      const tickers = positions.map(p => p.ticker).join(", ") || "없음";

      const riskMap = {
        conservative: "보수적 (원금 보존 우선)",
        moderate: "중립적 (수익/위험 균형)",
        aggressive: "공격적 (고수익 추구)",
      };
      const goalMap = {
        growth: "성장주 중심",
        income: "배당/인컴",
        preservation: "자산 보존",
        balanced: "균형 포트폴리오",
      };
      const horizonMap = {
        short: "단기 (1년 이내)",
        mid: "중기 (1-5년)",
        long: "장기 (5년+)",
      };

      const prompt = `투자자 프로필: 위험성향=${riskMap[input.riskTolerance]}, 목표=${goalMap[input.investmentGoal]}, 투자기간=${horizonMap[input.timeHorizon]}${input.monthlyBudget ? `, 월 투자금액=$${input.monthlyBudget}` : ""}.
현재 보유 종목: ${tickers}.

이 투자자에게 맞는 구체적인 투자 플랜을 JSON으로 제시해주세요:
{
  "summary": "2문장 요약",
  "allocation": [{"asset": "자산군", "pct": 숫자, "reason": "이유"}],
  "recommendedStocks": [{"ticker": "심볼", "name": "이름", "reason": "이유"}],
  "monthlyAction": "이번 달 액션 플랜 한 문장",
  "risks": ["리스크1", "리스크2"],
  "rebalanceFrequency": "리밸런싱 주기"
}`;

      try {
        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "개인 투자 어드바이저입니다. JSON으로만 응답하세요.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        return {
          ...JSON.parse(resp.choices[0].message.content),
          profile: input,
          generatedAt: new Date(),
        };
      } catch {
        return {
          summary: "투자 플랜을 생성 중입니다.",
          allocation: [
            { asset: "미국 주식", pct: 60, reason: "성장성" },
            { asset: "채권", pct: 30, reason: "안정성" },
            { asset: "현금", pct: 10, reason: "유동성" },
          ],
          recommendedStocks: [],
          monthlyAction: "매월 정액 적립식 투자를 권장합니다.",
          risks: ["시장 변동성"],
          rebalanceFrequency: "분기별",
          profile: input,
          generatedAt: new Date(),
        };
      }
    }),

  // ── 11. 멀티 전략 백테스트 ────────────────────────────────
  multiBacktest: protectedProcedure
    .input(
      z.object({
        ticker: z.string(),
        period: z.enum(["6mo", "1y", "2y"]).default("1y"),
      })
    )
    .mutation(async ({ input }) => {
      const candles = await getHistoricalData(
        input.ticker.toUpperCase(),
        input.period
      );
      if (candles.length < 30) return { strategies: [], ticker: input.ticker };

      const closes = candles.map(c => c.close);
      const results: any[] = [];

      // 전략 1: RSI 역추세
      let rsiCapital = 10000;
      let rsiTrades = 0;
      let rsiWins = 0;
      for (let i = 15; i < candles.length - 1; i++) {
        const rsi = candles[i].rsi;
        if (!rsi) continue;
        const nextReturn = (closes[i + 1] - closes[i]) / closes[i];
        if (rsi < 35) {
          rsiCapital *= 1 + nextReturn;
          rsiTrades++;
          if (nextReturn > 0) rsiWins++;
        } else if (rsi > 65) {
          rsiCapital *= 1 - nextReturn;
          rsiTrades++;
          if (nextReturn < 0) rsiWins++;
        }
      }
      results.push({
        name: "RSI 역추세",
        returnPct: (rsiCapital / 10000 - 1) * 100,
        trades: rsiTrades,
        winRate: rsiTrades > 0 ? (rsiWins / rsiTrades) * 100 : 0,
      });

      // 전략 2: MA 골든크로스
      let maCapital = 10000;
      let maTrades = 0;
      let maWins = 0;
      for (let i = 1; i < candles.length - 1; i++) {
        const prev = candles[i - 1];
        const cur = candles[i];
        if (!prev.ma5 || !prev.ma20 || !cur.ma5 || !cur.ma20) continue;
        const nextReturn = (closes[i + 1] - closes[i]) / closes[i];
        if (prev.ma5! < prev.ma20! && cur.ma5! > cur.ma20!) {
          maCapital *= 1 + nextReturn;
          maTrades++;
          if (nextReturn > 0) maWins++;
        } else if (prev.ma5! > prev.ma20! && cur.ma5! < cur.ma20!) {
          maCapital *= 1 - nextReturn;
          maTrades++;
          if (nextReturn < 0) maWins++;
        }
      }
      results.push({
        name: "MA 골든크로스",
        returnPct: (maCapital / 10000 - 1) * 100,
        trades: maTrades,
        winRate: maTrades > 0 ? (maWins / maTrades) * 100 : 0,
      });

      // 전략 3: 볼린저 밴드
      let bbCapital = 10000;
      let bbTrades = 0;
      let bbWins = 0;
      for (let i = 1; i < candles.length - 1; i++) {
        const cur = candles[i];
        if (!cur.bbLower || !cur.bbUpper) continue;
        const nextReturn = (closes[i + 1] - closes[i]) / closes[i];
        if (cur.close < cur.bbLower!) {
          bbCapital *= 1 + nextReturn;
          bbTrades++;
          if (nextReturn > 0) bbWins++;
        } else if (cur.close > cur.bbUpper!) {
          bbCapital *= 1 - nextReturn;
          bbTrades++;
          if (nextReturn < 0) bbWins++;
        }
      }
      results.push({
        name: "볼린저 밴드",
        returnPct: (bbCapital / 10000 - 1) * 100,
        trades: bbTrades,
        winRate: bbTrades > 0 ? (bbWins / bbTrades) * 100 : 0,
      });

      // 전략 4: 바이 앤 홀드
      const buyHold =
        ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
      results.push({
        name: "바이 앤 홀드",
        returnPct: buyHold,
        trades: 2,
        winRate: buyHold > 0 ? 100 : 0,
      });

      return {
        ticker: input.ticker.toUpperCase(),
        period: input.period,
        strategies: results.sort((a, b) => b.returnPct - a.returnPct),
        analyzedAt: new Date(),
      };
    }),

  // ── 12. 글로벌 리스크 분석 ────────────────────────────────
  globalRisk: publicProcedure.query(async () => {
    const cacheKey = "global_risk_analysis";
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const { getGlobalIndices, getFearGreedIndex } = await import(
        "../finnhub"
      );
      const [vixQuote, indices, fearGreed] = await Promise.all([
        getQuote("^VIX"),
        getGlobalIndices(),
        getFearGreedIndex(),
      ]);
      const vix = (vixQuote as any)?.regularMarketPrice || 20;
      const usChange =
        indices.find((i: any) => i.ticker === "^GSPC")?.changePercent || 0;
      const krChange =
        indices.find((i: any) => i.ticker === "^KS11")?.changePercent || 0;

      const riskLevel = vix > 30 ? "High" : vix > 20 ? "Moderate" : "Low";
      const riskScore = Math.min(100, Math.round(vix * 2.5));

      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "글로벌 리스크 분석가입니다. JSON으로만 응답하세요.",
          },
          {
            role: "user",
            content: `VIX=${vix.toFixed(1)}, 공포탐욕=${fearGreed.score}(${fearGreed.label}), S&P500=${usChange.toFixed(2)}%, KOSPI=${krChange.toFixed(2)}%. 글로벌 리스크를 JSON으로 분석:{"summary":"요약","topRisks":["리스크1","리스크2","리스크3"],"opportunities":["기회1","기회2"],"recommendation":"투자 전략 한 문장"}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const aiAnalysis = JSON.parse(resp.choices[0].message.content);

      const result = {
        vix,
        riskLevel,
        riskScore,
        fearGreed,
        indices,
        aiAnalysis,
        updatedAt: new Date(),
      };
      cache.set(cacheKey, result, 30 * 60 * 1000);
      return result;
    } catch {
      return {
        vix: 20,
        riskLevel: "Moderate",
        riskScore: 50,
        fearGreed: { score: 50, label: "Neutral" },
        indices: [],
        aiAnalysis: {
          summary: "분석 중",
          topRisks: [],
          opportunities: [],
          recommendation: "",
        },
        updatedAt: new Date(),
      };
    }
  }),

  // ── 13. 가격 알림 (서버 상태 저장용) ─────────────────────
  priceAlerts: protectedProcedure.query(async ({ ctx }) => {
    // 실제 알림은 클라이언트 폴링으로 처리, 서버는 현재 가격만 반환
    const positions = await getPositions(ctx.user.id);
    const prices: Record<string, number> = {};
    for (const pos of positions.slice(0, 10)) {
      try {
        const q = await getQuote(pos.ticker);
        prices[pos.ticker] = (q as any)?.regularMarketPrice || 0;
      } catch {
        /* skip */
      }
    }
    return { prices, updatedAt: new Date() };
  }),
});
