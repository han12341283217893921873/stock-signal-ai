import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getHistoricalData } from "../finnhub";
import { invokeLLM } from "../_core/llm";
import { getCachedChartPattern, saveChartPattern } from "../db";

export const chartPatternRouter = router({
  /** AI 차트 패턴 인식 - 최근 60일 OHLC 데이터를 LLM으로 분석 */
  analyze: protectedProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();

      // 1. 캐시 확인
      const cached = await getCachedChartPattern(ticker);
      if (cached) {
        return {
          patternName: cached.patternName,
          patternNameKr: cached.patternNameKr,
          direction: cached.direction as any,
          confidence: cached.confidence,
          description: cached.description,
          priceTarget: cached.priceTarget,
          keyPoints: cached.keyPoints ? JSON.parse(cached.keyPoints) : [],
          analyzedAt: cached.analyzedAt,
          isFromCache: true,
        };
      }

      const candles = await getHistoricalData(ticker, "3mo");
      const recent60 = candles.slice(-60);

      if (recent60.length < 20) {
        return {
          patternName: "N/A",
          patternNameKr: "데이터 부족",
          direction: "neutral" as const,
          confidence: 0,
          description: "종목 데이터가 부족하여 패턴 분석을 수행할 수 없습니다.",
          priceTarget: "",
          keyPoints: [],
          analyzedAt: new Date(),
        };
      }

      const ohlcText = recent60
        .map(
          c =>
            `${c.date.slice(5, 10)}: O=${c.open.toFixed(1)} H=${c.high.toFixed(1)} L=${c.low.toFixed(1)} C=${c.close.toFixed(1)}`
        )
        .join("\n");

      const firstClose = recent60[0].close;
      const lastClose = recent60[recent60.length - 1].close;
      const highestHigh = Math.max(...recent60.map(c => c.high));
      const lowestLow = Math.min(...recent60.map(c => c.low));
      const pctChange = (((lastClose - firstClose) / firstClose) * 100).toFixed(
        1
      );

      // 추세 보조 정보 (MA20 등)
      const ma20 =
        recent60.length >= 20
          ? (recent60.slice(-20).reduce((s, c) => s + c.close, 0) / 20).toFixed(
              2
            )
          : "N/A";

      const prompt = `당신은 차트 패턴 분석 전문가입니다. ${ticker}의 최근 60일 OHLC 데이터를 보고 패턴을 식별하세요.

[요약 정보]
- 현재가: ${lastClose.toFixed(2)} (${Number(pctChange) > 0 ? "+" : ""}${pctChange}%)
- 60일 고가: ${highestHigh.toFixed(2)} / 저가: ${lowestLow.toFixed(2)}
- 20일 이동평균선: ${ma20}

[OHLC 데이터 추출]
${ohlcText}

[지시 사항]
1. 위 데이터를 시각화하여 상상하고, 쌍바닥(Double Bottom), 헤드앤숄더, 삼각형 수렴 등 기술적 패턴을 찾으세요.
2. 뚜렷한 패턴이 없다면 "박스권 횡보" 또는 "추세 지속"으로 응답하세요.
3. 반드시 다음 JSON 형식으로만 답변하세요 (다른 텍스트 금지):
{
  "patternName": "English Pattern Name",
  "patternNameKr": "한글 패턴명",
  "direction": "bullish | bearish | neutral",
  "confidence": 0-100,
  "description": "패턴 판단 근거 (2문장)",
  "priceTarget": "예상되는 향후 가격 움직임",
  "keyPoints": ["주요 지지선/저항선", "거래량 특이사항"]
}`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "금융 차트 전문가로서 JSON 형식으로만 답변합니다.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const raw = response.choices?.[0]?.message?.content;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

        const result = {
          patternName: parsed.patternName ?? "N/A",
          patternNameKr: parsed.patternNameKr ?? "분석 불가",
          direction: (parsed.direction ?? "neutral") as
            | "bullish"
            | "bearish"
            | "neutral",
          confidence: Math.max(
            0,
            Math.min(100, Number(parsed.confidence ?? 0))
          ),
          description: parsed.description ?? "",
          priceTarget: parsed.priceTarget ?? "",
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
          analyzedAt: new Date(),
        };

        // 2. 분석 성공 시에만 캐시 저장
        if (result.patternName !== "N/A" && result.confidence > 0) {
          await saveChartPattern({
            ticker,
            patternName: result.patternName,
            patternNameKr: result.patternNameKr,
            direction: result.direction,
            confidence: result.confidence,
            description: result.description,
            priceTarget: result.priceTarget,
            keyPoints: JSON.stringify(result.keyPoints),
            analyzedAt: result.analyzedAt,
          });
        }

        return { ...result, isFromCache: false };
      } catch (err) {
        console.error("[ChartPattern] LLM analysis failed:", err);
        return {
          patternName: "Analysis Error",
          patternNameKr: "분석 일시 오류",
          direction: "neutral" as const,
          confidence: 0,
          description:
            "현재 실시간 데이터 분석량이 많아 처리가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
          priceTarget: "",
          keyPoints: [],
          analyzedAt: new Date(),
        };
      }
    }),
  /** AI 종합 분석 리포트 생성 */
  generateReport: publicProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const candles = await getHistoricalData(ticker, "6mo");

      if (candles.length < 50) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "분석을 위한 충분한 데이터가 없습니다.",
        });
      }

      const recent = candles.slice(-30);
      const last = recent[recent.length - 1];
      const prev = recent[recent.length - 2];

      // 기술적 지표 추출
      const rsi = last.rsi?.toFixed(1) ?? "N/A";
      const macd = last.macd?.toFixed(2) ?? "N/A";
      const trend = last.close > (last.ma20 ?? 0) ? "상승" : "하락";
      const volChange = (
        ((last.volume - prev.volume) / prev.volume) *
        100
      ).toFixed(1);

      const prompt = `${ticker} 종목의 기술적 분석 리포트를 작성해주세요.
[데이터 개요]
- 현재가: ${last.close}
- RSI: ${rsi} (과매수 > 70, 과매도 < 30)
- MACD: ${macd}
- 20일 이평선 기준 추세: ${trend}
- 전일 대비 거래량 변화: ${volChange}%

[지시 사항]
1. 현재의 기술적 위치를 진단하세요.
2. 단기(1-2주) 및 중기(1-3개월) 전망을 제시하세요.
3. 구체적인 매수/매도 전략(진입가, 목표가, 손절가 제안)을 포함하세요.
4. 초보 투자자도 이해할 수 있게 친절하고 전문적인 톤으로 작성하세요.
5. 반드시 JSON 형식으로만 응답하세요:
{
  "summary": "한 줄 요약",
  "diagnosis": "현재 기술적 상태 진단 (3문장)",
  "shortTerm": "단기 전망",
  "midTerm": "중기 전망",
  "strategy": {
    "action": "매수 | 관망 | 매도",
    "entry": "적정 진입가 범위",
    "target": "1차 목표가",
    "stopLoss": "손절가"
  },
  "riskFactor": "주의해야 할 리스크 요소"
}`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "금융 분석가로서 전문적인 리포트를 JSON으로 제공합니다.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const raw = response.choices?.[0]?.message?.content;
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "리포트 생성 중 오류가 발생했습니다.",
        });
      }
    }),
});
