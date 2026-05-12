import { publicProcedure, scannerProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { runScanner, getScanCache, calculateTradeGuide } from "../scanner";
import { saveScanHistory, getScanHistoryList } from "../db";
import { getStockSummary, getHistoricalData } from "../finnhub";
import { invokeLLM } from "../_core/llm";

const TICKER_REGEX = /^[A-Z0-9.^]{1,20}$/;

export const scannerRouter = router({
  /** 스캔 시작 (백그라운드) - 분당 3회 제한 */
  start: publicProcedure
    .use(scannerProcedure._def.middlewares[0])
    .input(z.object({ market: z.enum(["us", "kr", "all"]).default("us") }))
    .mutation(async ({ input }) => {
      const market = input.market;
      (async () => {
        try {
          await runScanner(market);
          const cache = getScanCache(market);
          if (
            !cache.isRunning &&
            cache.completedAt &&
            cache.results.length > 0
          ) {
            // ScanResult 필드명 수정: r.signal.type → r.signalType, r.signal.strength → r.signalStrength
            const buys = cache.results
              .filter((r: any) => r.signalType === "buy")
              .slice(0, 10);
            const sells = cache.results
              .filter((r: any) => r.signalType === "sell")
              .slice(0, 10);
            // market === "all" 시 "all"을 그대로 저장 (강제 "us" 변환 제거)
            const mkt = market as "us" | "kr" | "all";
            await saveScanHistory({
              market: mkt,
              totalScanned: cache.results.length,
              topBuys: JSON.stringify(
                buys.map((r: any) => ({
                  ticker: r.ticker,
                  name: r.name,
                  strength: r.signalStrength,
                }))
              ),
              topSells: JSON.stringify(
                sells.map((r: any) => ({
                  ticker: r.ticker,
                  name: r.name,
                  strength: r.signalStrength,
                }))
              ),
            });
          }
        } catch (err) {
          console.error("[Scanner] Failed to save scan history:", err);
        }
      })();
      return { started: true, market: input.market };
    }),

  /** 스캔 진행 상황 및 결과 조회 */
  status: publicProcedure
    .input(z.object({ market: z.enum(["us", "kr", "all"]).default("us") }))
    .query(({ input }) => {
      return getScanCache(input.market);
    }),

  /** 스캔 결과 기반 AI 마켓 인사이트 생성 */
  aiInsights: publicProcedure
    .input(z.object({ market: z.enum(["us", "kr", "all"]).default("us") }))
    .query(async ({ input }) => {
      const cache = getScanCache(input.market);
      if (cache.results.length === 0) {
        return { insights: "스캔 결과가 없습니다. 먼저 스캔을 실행해주세요." };
      }

      // 1. 매수 또는 중립 신호가 강한 상위 15개 종목 추출
      const topStocks = cache.results
        .filter(r => r.signalType === "buy" || r.signalType === "neutral")
        .slice(0, 15)
        .map(
          r =>
            `${r.ticker}(${r.name}): 신호 ${r.signalType === "buy" ? "매수" : "중립"}(강도 ${r.signalStrength}), RSI ${r.rsi?.toFixed(1) || "N/A"}`
        )
        .join("\n");

      if (!topStocks) {
        return { insights: "현재 매수 신호가 포착된 유망 종목이 없습니다." };
      }

      // 2. AI 테마 분석 요청
      const prompt = `당신은 금융 시장 데이터 분석 전문가입니다. 아래의 스캔된 매수 유망 종목 리스트를 분석하여 현재 시장의 '핵심 테마'와 '투자 인사이트'를 보고서 형식으로 작성해주세요.

[매수 유망 종목 리스트]
${topStocks}

[지시 사항]
1. 리스트의 종목들을 공통된 산업군이나 테마(예: AI 인프라, 반도체 반등, 방어적 가치주 등)로 그룹화하세요.
2. 현재 시장에서 어떤 흐름이 감지되는지 2~3가지 핵심 테마로 정리하세요.
3. 가장 신뢰도가 높은 '오늘의 AI Pick' 종목 하나를 선정하고 이유를 설명하세요.
4. 각 테마나 추천 종목별로 '권장 투자 기간(단기/중기/장기)'과 '예상 보유 기간'을 반드시 포함하여 설명하세요.
5. 전문적이고 통찰력 있는 한국어로 답변하세요. 마크다운 형식을 사용하세요.`;

      try {
        console.log(`[Scanner AI Insights] Generating for ${input.market}...`);
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "당신은 시장 데이터를 분석하여 투자 테마를 도출하는 AI 애널리스트입니다.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        });

        console.log(
          `[Scanner AI Insights] Generation complete for ${input.market}`
        );
        return {
          insights:
            response.choices?.[0]?.message?.content ||
            "인사이트를 생성할 수 없습니다.",
          analyzedAt: new Date(),
        };
      } catch (err) {
        console.error("[Scanner AI Insights] Failed:", err);
        return {
          insights:
            "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        };
      }
    }),
});

export const tradeGuideRouter = router({
  /** 종목 진입/청산 가이드 생성 */
  get: publicProcedure
    .input(
      z.object({
        ticker: z
          .string()
          .min(1)
          .max(20)
          .regex(TICKER_REGEX, "올바른 티커 형식이 아닙니다"),
      })
    )
    .query(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const [summary, candles] = await Promise.all([
        getStockSummary(ticker),
        getHistoricalData(ticker, "3mo"),
      ]);
      const guide = calculateTradeGuide(candles, summary.signal);
      return {
        ticker,
        name: summary.name,
        price: summary.price,
        currencySymbol: summary.currencySymbol ?? "$",
        signal: summary.signal,
        indicators: summary.indicators,
        tradeGuide: guide,
      };
    }),
});

export const scanHistoryRouter = router({
  list: publicProcedure
    .input(
      z.object({
        market: z.enum(["us", "kr", "all"]).default("us"),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const rows = await getScanHistoryList(input.market, input.limit);
      return rows.map(r => ({
        ...r,
        topBuys: r.topBuys ? JSON.parse(r.topBuys) : [],
        topSells: r.topSells ? JSON.parse(r.topSells) : [],
      }));
    }),
});
