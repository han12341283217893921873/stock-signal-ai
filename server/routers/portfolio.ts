import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getQuote, isKoreanTicker, getUsdKrwRate } from "../finnhub";
import {
  getPortfolioPositions,
  addPortfolioPosition,
  updatePortfolioPosition,
  removePortfolioPosition,
  savePortfolioSnapshot,
  getPortfolioSnapshots,
  getUserById,
  updateUserBalance,
  addTradeLog,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { getStockSummary } from "../finnhub";

/**
 * 포트폴리오 라우터
 * 모든 프로시저는 protectedProcedure를 사용하여 인증된 사용자만 접근 가능합니다.
 * GUEST_USER_ID 폴백이 제거되어 미인증 접근 시 UNAUTHORIZED 오류가 반환됩니다.
 */
export const portfolioRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const user = await getUserById(userId);
    const cashBalance = user?.cashBalance ?? 100000;
    const realizedPnl = user?.realizedPnl ?? 0;
    const krwBalance = user?.krwBalance ?? 30000000;
    const realizedPnlKrw = user?.realizedPnlKrw ?? 0;

    const positions = await getPortfolioPositions(userId);
    const tickers = Array.from(new Set(positions.map(p => p.ticker)));
    const quotes = await Promise.allSettled(
      tickers.map(async ticker => {
        const q = await getQuote(ticker);
        return {
          ticker,
          price: (q as any)?.regularMarketPrice ?? 0,
          currency: (q as any)?.currency ?? "USD",
        };
      })
    );
    const priceMap = new Map<string, { price: number; currency: string }>();
    quotes.forEach(r => {
      if (r.status === "fulfilled")
        priceMap.set(r.value.ticker, {
          price: r.value.price,
          currency: r.value.currency,
        });
    });
    const enrichedPositions = positions.map(p => {
      const current = priceMap.get(p.ticker);
      const currentPrice = current?.price ?? 0;
      const avgPrice = Number(p.avgPrice);
      const quantity = Number(p.quantity);
      const pnl = currentPrice > 0 ? (currentPrice - avgPrice) * quantity : 0;
      const pnlPct =
        currentPrice > 0 && avgPrice > 0
          ? ((currentPrice - avgPrice) / avgPrice) * 100
          : 0;
      const currency = current?.currency ?? "USD";
      const currencySymbol = currency === "KRW" ? "₩" : "$";
      return {
        ...p,
        currentPrice,
        currency,
        currencySymbol,
        pnl,
        pnlPct,
        totalValue: currentPrice * quantity,
      };
    });

    return {
      positions: enrichedPositions,
      cashBalance,
      realizedPnl,
      krwBalance,
      realizedPnlKrw,
    };
  }),

  buy: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        name: z.string().optional(),
        quantity: z.number().positive(),
        price: z.number().positive(),
        memo: z.string().optional(),
        signalScore: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const user = await getUserById(userId);
      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });

      const isKR = isKoreanTicker(input.ticker);
      const totalCostNative = input.quantity * input.price;

      if (isKR) {
        if (user.krwBalance < totalCostNative) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `잔액이 부족합니다. (필요: ₩${totalCostNative.toLocaleString()}, 보유: ₩${user.krwBalance.toLocaleString()})`,
          });
        }
        await updateUserBalance(userId, user.cashBalance, user.realizedPnl, user.krwBalance - totalCostNative, user.realizedPnlKrw);
      } else {
        if (user.cashBalance < totalCostNative) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `잔액이 부족합니다. (필요: $${totalCostNative.toLocaleString(undefined, {minimumFractionDigits: 2})}, 보유: $${user.cashBalance.toLocaleString(undefined, {minimumFractionDigits: 2})})`,
          });
        }
        await updateUserBalance(userId, user.cashBalance - totalCostNative, user.realizedPnl, user.krwBalance, user.realizedPnlKrw);
      }

      const positions = await getPortfolioPositions(userId);
      const existing = positions.find(
        p => p.ticker === input.ticker.toUpperCase()
      );

      // 2. 포지션 추가/업데이트
      if (existing) {
        const oldQty = Number(existing.quantity);
        const oldAvg = Number(existing.avgPrice);
        const newQty = oldQty + input.quantity;
        const newAvg = (oldQty * oldAvg + totalCostNative) / newQty;
        await updatePortfolioPosition(userId, existing.id, {
          quantity: newQty,
          avgPrice: newAvg,
          memo: input.memo ?? existing.memo,
          entrySignalScore:
            ((existing as any).entrySignalScore as number | null) ??
            input.signalScore,
        } as any);
      } else {
        await addPortfolioPosition({
          userId,
          ticker: input.ticker.toUpperCase(),
          name: input.name,
          quantity: input.quantity,
          avgPrice: input.price,
          memo: input.memo,
          entrySignalScore: input.signalScore,
        } as any);
      }

      // 3. 거래 기록
      await addTradeLog({
        userId,
        ticker: input.ticker.toUpperCase(),
        type: "buy",
        date: new Date(),
        price: input.price,
        content: `매수: ${input.quantity}주 @ ${isKR ? "₩" : "$"}${input.price.toLocaleString()}`,
      });

      return { success: true, cashBalance: isKR ? user.cashBalance : user.cashBalance - totalCostNative, krwBalance: isKR ? user.krwBalance - totalCostNative : user.krwBalance };
    }),

  sell: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        quantity: z.number().positive(),
        price: z.number().positive(),
        memo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const user = await getUserById(userId);
      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });

      const positions = await getPortfolioPositions(userId);
      const existing = positions.find(
        p => p.ticker === input.ticker.toUpperCase()
      );

      if (!existing || Number(existing.quantity) < input.quantity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "매도할 수량이 부족합니다.",
        });
      }

      const isKR = isKoreanTicker(input.ticker);

      const totalRevenueNative = input.quantity * input.price;
      const avgPriceNative = Number(existing.avgPrice);
      const realizedGainNative = (input.price - avgPriceNative) * input.quantity;

      // 1. 현금 및 실현 손익 업데이트
      let newCash = user.cashBalance;
      let newPnl = user.realizedPnl;
      let newKrw = user.krwBalance;
      let newKrwPnl = user.realizedPnlKrw;

      if (isKR) {
        newKrw += totalRevenueNative;
        newKrwPnl += realizedGainNative;
      } else {
        newCash += totalRevenueNative;
        newPnl += realizedGainNative;
      }

      await updateUserBalance(userId, newCash, newPnl, newKrw, newKrwPnl);

      // 2. 포지션 차감/삭제
      const remainingQty = Number(existing.quantity) - input.quantity;
      if (remainingQty <= 0) {
        await removePortfolioPosition(userId, existing.id);
      } else {
        await updatePortfolioPosition(userId, existing.id, {
          quantity: remainingQty,
          memo: input.memo ?? existing.memo,
        });
      }

      // 3. 거래 기록
      await addTradeLog({
        userId,
        ticker: input.ticker.toUpperCase(),
        type: "sell",
        date: new Date(),
        price: input.price,
        content: `매도: ${input.quantity}주 @ ${isKR ? "₩" : "$"}${input.price.toLocaleString()} (수익: ${isKR ? "₩" : "$"}${realizedGainNative.toLocaleString(undefined, {maximumFractionDigits: 2})})`,
      });

      return { success: true, cashBalance: newCash, realizedPnl: newPnl, krwBalance: newKrw, realizedPnlKrw: newKrwPnl };
    }),

  /** 포트폴리오 스냅샷 저장 */
  saveSnapshot: protectedProcedure
    .input(
      z.object({
        totalValue: z.number(),
        totalInvested: z.number(),
        pnlPercent: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().slice(0, 10);
      await savePortfolioSnapshot({
        userId: ctx.user.id,
        totalValue: input.totalValue,
        totalInvested: input.totalInvested,
        pnlPercent: input.pnlPercent,
        snapshotDate: today,
      });
      return { success: true };
    }),

  /** 포트폴리오 스냅샷 조회 */
  snapHistory: protectedProcedure.query(async ({ ctx }) => {
    return getPortfolioSnapshots(ctx.user.id);
  }),

  /** 포트폴리오 리스크 분석 (MDD, 샤프 지수) */
  riskAnalysis: protectedProcedure.query(async ({ ctx }) => {
    const snapshots = await getPortfolioSnapshots(ctx.user.id);
    if (snapshots.length < 2) {
      return { mdd: 0, sharpeRatio: 0, volatility: 0, totalReturn: 0 };
    }

    // 날짜 오름차순 정렬
    const sorted = [...snapshots].sort(
      (a, b) =>
        new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
    );

    // 1. 누적 수익률
    const startValue = Number(sorted[0].totalInvested);
    const endValue = Number(sorted[sorted.length - 1].totalValue);
    const totalReturn =
      startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

    // 2. MDD 계산
    let peak = -Infinity;
    let maxDrawdown = 0;
    sorted.forEach(s => {
      const val = Number(s.totalValue);
      if (val > peak) peak = val;
      if (peak > 0) {
        const drawdown = (peak - val) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
    });

    // 3. 변동성 및 샤프 지수 계산
    const returns = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = Number(sorted[i - 1].totalValue);
      const curr = Number(sorted[i].totalValue);
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }

    if (returns.length < 2) {
      return {
        mdd: maxDrawdown * 100,
        sharpeRatio: 0,
        volatility: 0,
        totalReturn,
      };
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) /
      returns.length;
    const volatility = Math.sqrt(variance);

    // 무위험 수익률 0 가정, 연율화 (단순화: 일별 데이터 기준 * sqrt(252))
    const annReturn = avgReturn * 252;
    const annVol = volatility * Math.sqrt(252);
    const sharpeRatio = annVol > 0 ? annReturn / annVol : 0;

    return {
      mdd: maxDrawdown * 100,
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      volatility: Number((annVol * 100).toFixed(2)),
      totalReturn: Number(totalReturn.toFixed(2)),
    };
  }),

  /** 포트폴리오 상관관계 매트릭스 계산 */
  correlation: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const positions = await getPortfolioPositions(userId);
    const tickers = Array.from(new Set(positions.map(p => p.ticker))).slice(
      0,
      10
    );
    if (tickers.length < 2) return { tickers, matrix: [] };

    const { getHistoricalData } = await import("../finnhub");
    const dataMap = new Map<string, number[]>();

    await Promise.all(
      tickers.map(async ticker => {
        try {
          const candles = await getHistoricalData(ticker, "1mo");
          if (candles && candles.length > 5) {
            const returns = [];
            for (let i = 1; i < candles.length; i++) {
              returns.push(
                (candles[i].close - candles[i - 1].close) / candles[i - 1].close
              );
            }
            dataMap.set(ticker, returns);
          }
        } catch (err) {
          console.warn(`[Correlation] Failed for ${ticker}:`, err);
        }
      })
    );

    const validTickers = Array.from(dataMap.keys());
    if (validTickers.length < 2) return { tickers: validTickers, matrix: [] };

    const matrix: number[][] = [];
    for (let i = 0; i < validTickers.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < validTickers.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (j < i) {
          matrix[i][j] = matrix[j][i];
        } else {
          const r1_raw = dataMap.get(validTickers[i])!;
          const r2_raw = dataMap.get(validTickers[j])!;
          const len = Math.min(r1_raw.length, r2_raw.length);
          const r1 = r1_raw.slice(-len);
          const r2 = r2_raw.slice(-len);
          matrix[i][j] = calculateCorrelation(r1, r2);
        }
      }
    }

    return { tickers: validTickers, matrix };
  }),

  /** 전체 포트폴리오 과거 성과 시뮬레이션 (Backtest) */
  backtestAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const { cache } = await import("../finnhub");
    const cacheKey = `backtest_${userId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    const positions = await getPortfolioPositions(userId);
    if (positions.length === 0) return { history: [], benchmark: [] };

    const { getHistoricalData } = await import("../finnhub");

    // 1. 각 종목별 과거 데이터 가져오기 (1년치)
    const tickerHistory = await Promise.all(
      positions.map(async p => {
        try {
          const candles = await getHistoricalData(p.ticker, "1y");
          return { ticker: p.ticker, quantity: Number(p.quantity), candles };
        } catch {
          return { ticker: p.ticker, quantity: 0, candles: [] };
        }
      })
    );

    // 2. 벤치마크 (S&P 500) 데이터 가져오기
    const spyHistory = await getHistoricalData("^GSPC", "1y");

    // 3. 일별 통합 가치 계산
    const dateMap = new Map<string, number>();

    tickerHistory.forEach(({ quantity, candles }) => {
      candles.forEach(c => {
        const date = c.date.split("T")[0];
        const val = (dateMap.get(date) || 0) + c.close * quantity;
        dateMap.set(date, val);
      });
    });

    const dates = Array.from(dateMap.keys()).sort();
    if (dates.length === 0) return { history: [], benchmark: [] };

    // ✅ 버그 수정: 초기 기준값을 '실제 매입가 × 수량' 합계로 설정
    // (1년 전 주가 기준으로 잡으면 한국 주식 등에서 분모가 0에 가까워져 수천% 오류 발생)
    const totalCostBasis = positions.reduce(
      (sum, p) => sum + Number(p.avgPrice) * Number(p.quantity),
      0
    );
    const initialPortfolioValue =
      totalCostBasis > 0 ? totalCostBasis : dateMap.get(dates[0]) || 1;

    const spyStart = spyHistory[0]; // S&P 500 1년 전 첫 거래일 기준
    const initialSpyValue = spyStart?.close || 1;

    const history = dates.map(date => ({
      date,
      value: dateMap.get(date) || 0,
      change:
        initialPortfolioValue > 0
          ? Number(
              (
                (((dateMap.get(date) || 0) - initialPortfolioValue) /
                  initialPortfolioValue) *
                100
              ).toFixed(2)
            )
          : 0,
    }));

    const benchmark = spyHistory
      .filter(c => dateMap.has(c.date.split("T")[0]))
      .map(c => ({
        date: c.date.split("T")[0],
        value: c.close,
        change:
          initialSpyValue > 0
            ? Number(
                (((c.close - initialSpyValue) / initialSpyValue) * 100).toFixed(
                  2
                )
              )
            : 0,
      }));

    const result = { history, benchmark };
    cache.set(cacheKey, result, 12 * 60 * 60 * 1000); // Cache for 12 hours
    return result;
  }),

  /** AI 포트폴리오 어드바이저 - 포트폴리오 분석 및 최적화 제안 */
  aiAdvice: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const positions = await getPortfolioPositions(userId);
    if (positions.length === 0) {
      return {
        advice:
          "포트폴리오에 종목이 없습니다. 분석을 위해 종목을 추가해주세요.",
      };
    }

    // 1. 상세 데이터 수집 (시세 + 신호)
    const detailedPositions = await Promise.all(
      positions.map(async p => {
        try {
          const summary = await getStockSummary(p.ticker);
          return {
            ticker: p.ticker,
            name: p.name || p.ticker,
            quantity: Number(p.quantity),
            avgPrice: Number(p.avgPrice),
            currentPrice: summary.price,
            pnlPct: (
              ((summary.price - Number(p.avgPrice)) / Number(p.avgPrice)) *
              100
            ).toFixed(1),
            signal: summary.signal.gradeLabel || summary.signal.type,
            strength: summary.signal.strength,
            rsi: summary.indicators.rsi,
          };
        } catch {
          return {
            ticker: p.ticker,
            name: p.name || p.ticker,
            quantity: Number(p.quantity),
            avgPrice: Number(p.avgPrice),
            currentPrice: 0,
            pnlPct: "0",
            signal: "N/A",
            strength: 0,
            rsi: 0,
          };
        }
      })
    );

    // 2. 매크로 데이터 수집 (컨텍스트용)
    let macroContext = "";
    try {
      const { getMacroIndices } = await import("./macro");
      const indices = await getMacroIndices();
      macroContext = indices
        .map(
          (i: any) =>
            `${i.name}: ${i.changePercent >= 0 ? "+" : ""}${i.changePercent.toFixed(1)}%`
        )
        .join(", ");
    } catch {
      macroContext = "매크로 데이터 로드 실패";
    }

    // 3. AI 분석 요청
    const totalValue = detailedPositions.reduce(
      (sum, p) => sum + p.currentPrice * p.quantity,
      0
    );
    const portfolioSummary = detailedPositions
      .map(p => {
        const weight =
          totalValue > 0
            ? (((p.currentPrice * p.quantity) / totalValue) * 100).toFixed(1)
            : "0";
        return `- ${p.ticker}(${p.name}): 비중 ${weight}%, 수익률 ${p.pnlPct}%, AI신호 ${p.signal}(강도 ${p.strength}), RSI ${p.rsi?.toFixed(1) || "N/A"}`;
      })
      .join("\n");

    const prompt = `당신은 전문 자산 관리 AI 어드바이저입니다. 아래의 사용자 포트폴리오와 시장 상황을 분석하여 투자 조언을 제공해주세요.

[현재 시장 상황 (매크로 지표)]
${macroContext}

[사용자 포트폴리오 현황]
${portfolioSummary}

[지시 사항]
1. 포트폴리오의 전체적인 리스크(비중 쏠림, 신호 부정적 종목 등)를 진단하세요.
2. AI 신호가 좋지 않거나(Sell) 과매수(RSI > 70)된 종목에 대해 구체적인 대응 전략을 제안하세요.
3. 포트폴리오 다각화 관점에서 보완할 점을 한 문장으로 요약하고, 전체적인 '포트폴리오 건강 점수(0~100)'를 매기세요.
4. 각 보유 종목별로 '권장 투자 성향(장기/단기)'과 '최적의 보유 기간'을 언급하여 전략을 구체화하세요.
5. 친절하고 전문적인 어조로 답변하세요. 한국어로 답변하세요.`;

    try {
      console.log(`[Portfolio AI Advice] Generating for user ${userId}...`);
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "금융 시장 분석 전문가로서 포트폴리오 진단 결과를 제공합니다.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      });

      console.log(
        `[Portfolio AI Advice] Generation complete for user ${userId}`
      );
      return {
        advice:
          response.choices?.[0]?.message?.content ||
          "조언을 생성할 수 없습니다.",
        analyzedAt: new Date(),
      };
    } catch (err) {
      console.error("[AI Advice] Failed:", err);
      return {
        advice: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        analyzedAt: new Date(),
      };
    }
  }),

  /** 배당금 캘린더 (Feature 22) */
  dividends: protectedProcedure.query(async ({ ctx }) => {
    const positions = await getPortfolioPositions(ctx.user.id);
    const tickers = Array.from(new Set(positions.map(p => p.ticker)));
    const { getDividends } = await import("../finnhub");

    const dividendResults = await Promise.all(
      tickers.map(async ticker => {
        const divs = await getDividends(ticker);
        const position = positions.find(p => p.ticker === ticker);
        return divs.map((d: any) => ({
          ticker,
          name: position?.name || ticker,
          quantity: Number(position?.quantity || 0),
          amount: d.amount,
          exDate: d.date,
          payDate: d.payDate,
          currency: d.currency,
          totalDividend: d.amount * Number(position?.quantity || 0),
        }));
      })
    );

    return dividendResults
      .flat()
      .sort(
        (a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime()
      );
  }),

  /** 포트폴리오 스트레스 테스트 (Feature 21) */
  stressTest: protectedProcedure.query(async ({ ctx }) => {
    const positions = await getPortfolioPositions(ctx.user.id);
    if (positions.length === 0) return null;

    const totalInvested = positions.reduce(
      (sum, p) => sum + Number(p.avgPrice) * Number(p.quantity),
      0
    );

    // 시나리오 정의
    const scenarios = [
      {
        name: "2008 금융위기",
        drop: -0.55,
        description: "리먼 브라더스 파산 및 서브프라임 모기지 사태 재현",
      },
      {
        name: "2020 팬데믹",
        drop: -0.34,
        description: "코로나19 확산으로 인한 글로벌 락다운",
      },
      { name: "2000 닷컴버블", drop: -0.49, description: "기술주 거품 붕괴" },
      {
        name: "블랙 먼데이",
        drop: -0.22,
        description: "1987년 역사상 최대 일일 하락폭",
      },
    ];

    return scenarios.map(s => ({
      ...s,
      estimatedLoss: totalInvested * s.drop,
      remainingValue: totalInvested * (1 + s.drop),
    }));
  }),

  /** 예상 세금 계산기 (Feature 25) */
  taxEstimator: protectedProcedure.query(async ({ ctx }) => {
    const positions = await getPortfolioPositions(ctx.user.id);

    let totalGainsKRW = 0;
    let totalGainsUSD = 0;

    for (const p of positions) {
      const q = await getQuote(p.ticker);
      const currentPrice = (q as any)?.regularMarketPrice || 0;
      const currency = (q as any)?.currency || "USD";
      const gain = (currentPrice - Number(p.avgPrice)) * Number(p.quantity);

      if (gain > 0) {
        if (currency === "KRW") {
          totalGainsKRW += gain;
        } else {
          totalGainsUSD += gain;
        }
      }
    }

    // 국내 주식 기본 공제액 (대주주 아닐 경우 양도세는 보통 0이나 여기서는 임의로 계산)
    const deductionKRW = 50000000; // 국내 주식 공제 (임의: 5000만원)
    const taxRateKRW = 0.22; // 22%
    const taxableAmountKRW = Math.max(0, totalGainsKRW - deductionKRW);
    const estimatedTaxKRW = taxableAmountKRW * taxRateKRW;

    // 해외 주식 기본 공제액
    const deductionUSD = 2500000; // 한화 250만원이지만 달러 환산 임의로 적용 (보통 환전된 원화 기준 계산됨)
    const taxRateUSD = 0.22; // 해외주식 양도세율 22%
    // 실시간 환율 (getUsdKrwRate 사용)
    const exchangeRate = await getUsdKrwRate();
    const totalGainsUSDInKRW = totalGainsUSD * exchangeRate;
    const taxableAmountUSDInKRW = Math.max(
      0,
      totalGainsUSDInKRW - deductionUSD
    );
    const estimatedTaxUSDInKRW = taxableAmountUSDInKRW * taxRateUSD;
    const estimatedTaxUSD = estimatedTaxUSDInKRW / exchangeRate;

    return {
      totalGainsKRW,
      totalGainsUSD,
      deductionKRW,
      deductionUSD,
      taxableAmountKRW,
      taxableAmountUSD: taxableAmountUSDInKRW / exchangeRate,
      estimatedTaxKRW,
      estimatedTaxUSD,
      currency: "MIXED", // 다중 통화 표시
    };
  }),

  /** 자산 배분 전략 제안 (Feature 48) */
  assetAllocation: protectedProcedure.query(async ({ ctx }) => {
    const { getEconomicCalendar } = await import("../finnhub");
    const { invokeLLM } = await import("../_core/llm");

    const events = await getEconomicCalendar();

    const prompt = `현재 경제 지표들과 시장 상황을 고려하여 최적의 자산 배분 전략(All-Weather 스타일)을 제안해주세요.
    최근 주요 경제 이벤트: ${JSON.stringify(events.slice(0, 5))}
    
    다음 형식의 JSON으로 응답하세요:
    {
      "weights": [
        { "asset": "주식", "weight": number, "color": "string" },
        { "asset": "채권", "weight": number, "color": "string" },
        { "asset": "금", "weight": number, "color": "string" },
        { "asset": "현금", "weight": number, "color": "string" }
      ],
      "reason": "배분 근거 설명 (1-2문장)",
      "marketPhase": "현재 시장 국면 (예: 인플레이션, 저성장 등)"
    }`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "자산 배분 전문가입니다." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      return {
        weights: [
          { asset: "주식", weight: 40, color: "#6366f1" },
          { asset: "채권", weight: 30, color: "#22c55e" },
          { asset: "금", weight: 15, color: "#f59e0b" },
          { asset: "현금", weight: 15, color: "#94a3b8" },
        ],
        reason: "시장 불확실성에 따른 표준 분산 투자 전략입니다.",
        marketPhase: "중립",
      };
    }
  }),

  /** 포트폴리오 건강검진 (비전문가용) */
  healthCheck: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const { getPortfolioPositions } = await import("../db");
    const { getStockSummary } = await import("../finnhub");
    const { invokeLLM } = await import("../_core/llm");

    const positions = await getPortfolioPositions(userId);
    if (positions.length === 0) {
      return {
        score: 0,
        status: "empty",
        summary: "포트폴리오가 비어 있습니다. 종목을 추가하여 건강검진을 시작해보세요!",
        details: [],
      };
    }

    // 1. 데이터 수집
    const enriched = await Promise.all(
      positions.map(async p => {
        try {
          const s = await getStockSummary(p.ticker);
          return {
            ticker: p.ticker,
            name: p.name || p.ticker,
            pnlPct: (((s.price - Number(p.avgPrice)) / Number(p.avgPrice)) * 100).toFixed(1),
            signal: s.signal.gradeLabel,
            industry: s.finnhubIndustry || "기타",
            weight: 0, // 나중에 계산
            value: s.price * Number(p.quantity),
          };
        } catch {
          return null;
        }
      })
    );

    const validPositions = enriched.filter((p): p is any => p !== null);
    const totalValue = validPositions.reduce((sum, p) => sum + p.value, 0);
    validPositions.forEach(p => {
      p.weight = Number(((p.value / totalValue) * 100).toFixed(1));
    });

    // 2. AI 진단 요청
    const prompt = `당신은 사용자의 주식 포트폴리오를 진단하는 전문 AI 의사입니다.
    아래 포트폴리오 현황을 보고 '건강 점수(0~100)'와 부문별 진단 결과를 한국어로 작성해주세요.

    [포트폴리오 현황]
    ${validPositions.map(p => `- ${p.ticker}(${p.name}): 비중 ${p.weight}%, 수익률 ${p.pnlPct}%, 신호 ${p.signal}, 업종 ${p.industry}`).join("\n")}

    [지시 사항]
    1. 전체적인 '건강 점수'를 0~100점 사이로 매기세요.
    2. '다각화(분산투자)', '수익성', '안정성' 3가지 부문으로 나누어 진단하세요.
    3. 비전문가가 이해하기 쉽게 "이런 점은 좋고, 이런 점은 위험해요"라고 친절하게 설명하세요.
    4. 개선을 위한 구체적인 액션 아이템(예: "IT 비중을 줄이세요")을 제시하세요.

    JSON으로 응답:
    {
      "score": number,
      "status": "excellent" | "good" | "warning" | "danger",
      "summary": "전체 요약 (1문장)",
      "details": [
        { "category": "다각화", "content": "진단 내용", "score": number },
        { "category": "수익성", "content": "진단 내용", "score": number },
        { "category": "안정성", "content": "진단 내용", "score": number }
      ],
      "actions": ["액션 아이템 1", "액션 아이템 2"]
    }`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "포트폴리오 전문 AI 의사입니다." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      return {
        score: 70,
        status: "good",
        summary: "전반적으로 양호한 포트폴리오입니다.",
        details: [],
        actions: ["정기적인 모니터링을 유지하세요."],
      };
    }
  }),

  /** AI 오토파일럿 설정 상태 조회 */
  autoPilotStatus: protectedProcedure.query(async ({ ctx }) => {
    const { cache } = await import("../finnhub");
    const enabled = cache.get<boolean>(`autopilot_${ctx.user.id}`) ?? false;
    return { enabled };
  }),

  /** AI 오토파일럿 토글 */
  toggleAutoPilot: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { cache } = await import("../finnhub");
      cache.set(`autopilot_${ctx.user.id}`, input.enabled, 0); // 무기한 캐시 (서버 재시작 전까지)
      
      if (input.enabled) {
        // 즉시 첫 실행 시도 (백그라운드)
        const { runAutoPilot } = await import("../autopilot");
        runAutoPilot(ctx.user.id).catch(err => console.error("[AutoPilot] Initial run failed:", err));
      }
      
      return { success: true, enabled: input.enabled };
    }),
});

/** 피어슨 상관계수 계산 헬퍼 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const muX = x.reduce((a, b) => a + b, 0) / n;
  const muY = y.reduce((a, b) => a + b, 0) / n;
  const cov = x.reduce((sum, xi, i) => sum + (xi - muX) * (y[i] - muY), 0) / n;
  const stdX = Math.sqrt(
    x.reduce((sum, xi) => sum + Math.pow(xi - muX, 2), 0) / n
  );
  const stdY = Math.sqrt(
    y.reduce((sum, yi) => sum + Math.pow(yi - muY, 2), 0) / n
  );
  if (stdX === 0 || stdY === 0) return 0;
  return Number((cov / (stdX * stdY)).toFixed(2));
}
