import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getCompanyNews, getHistoricalData } from "../finnhub";
import { getRSSNews } from "../rss";
import { invokeLLM, parseJsonSafe } from "../_core/llm";

import { ENV } from "../_core/env";
import { getCachedNewsSummary, saveNewsSummary } from "../db";

export const newsRouter = router({
  /** AI 뉴스 감성 분석 */
  sentiment: publicProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();

      // 1. 캐시 확인 (비용 제로 전략)
      const cached = await getCachedNewsSummary(ticker);
      if (cached) {
        return {
          score: cached.score,
          label: cached.label,
          summary: cached.summary,
          keyFactors: cached.keyFactors ? JSON.parse(cached.keyFactors) : [],
          headlines: cached.headlines ? JSON.parse(cached.headlines) : [],
          analyzedAt: cached.analyzedAt,
          isFromCache: true,
        };
      }

      // 2. 뉴스 수집 (RSS + Finnhub 병행)
      const [rssNews, finnhubNews] = await Promise.all([
        getRSSNews(ticker),
        getCompanyNews(ticker).catch(() => []),
      ]);

      // 중복 제거 및 통합
      const headlines = [...rssNews, ...finnhubNews]
        .map(n => ({
          title: n.title,
          source: (n as any).source || "Finnhub",
          publishedAt: (n as any).pubDate || (n as any).datetime,
        }))
        .slice(0, 15);

      let priceContext = "";
      try {
        const candles = await getHistoricalData(ticker, "1mo");
        if (candles.length >= 5) {
          const recent = candles.slice(-5);
          const oldest = recent[0].close;
          const latest = recent[recent.length - 1].close;
          const pctChange = (((latest - oldest) / oldest) * 100).toFixed(1);
          const trend = Number(pctChange) > 0 ? "상승" : "하락";
          priceContext = `주가 데이터: 최근 5일간 ${trend} ${Math.abs(Number(pctChange))}% (${oldest.toLocaleString()} → ${latest.toLocaleString()})`;
        }
      } catch {
        priceContext = "주가 데이터 불러오기 실패";
      }

      const prompt = `[${ticker}] 주식(Stock) 종목에 대한 최신 뉴스 및 주가 데이터를 분석하여 시장 심리를 평가해주세요.

${priceContext}

${
  headlines.length > 0
    ? `최근 뉴스:
${headlines.map((item, i) => `[${i}] ${item.title}`).join("\n")}

`
    : "뉴스 헤드라인이 없어서 주가 데이터 기반 분석을 수행합니다."
}
      지시 사항:
      1. 반드시 "${ticker}" 주식/기업과 직접 관련된 뉴스만 분석하세요. 스포츠 팀, 동명이인, 무관한 조직 관련 기사는 isNoise:true로 표시하세요.
      2. 각 뉴스 헤드라인이 주가에 미칠 실질적 영향력(Impact: 1~10)을 평가하세요.
      3. 단순 홍보성이나 무의미한 기사는 isNoise:true로 표시하세요.
      4. 주가 추세와 최신 이슈를 고려하여 투자 심리를 평가하세요.
      5. 반드시 JSON 형식으로만 응답하세요:
      {
        "score": number (-1 to 1),
        "label": "매우 긍정" | "긍정" | "중립" | "부정" | "매우 부정",
        "summary": "한 문장 요약",
        "keyFactors": ["키워드1", "키워드2", "키워드3"],
        "filteredNews": [
           { "index": number, "impact": number, "isNoise": boolean, "reason": "영향력 설명" }
        ]
      }`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `당신은 냉철한 주식 시장 분석가입니다. 반드시 주식/금융 관련 뉴스만 분석하고, 스포츠·연예·무관한 뉴스는 노이즈로 처리하세요. JSON 형식으로만 응답하세요.`,
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        const raw = response.choices?.[0]?.message?.content;
        const parsed = typeof raw === "string" ? parseJsonSafe(raw) : raw;

        const enrichedHeadlines = headlines.map((h, i) => {
          const analysis = parsed.filteredNews?.find((f: any) => f.index === i);
          return {
            ...h,
            impact: analysis?.impact ?? 1,
            isNoise: analysis?.isNoise ?? false,
            impactReason: analysis?.reason ?? "",
          };
        });

        const result = {
          score: Math.max(-1, Math.min(1, Number(parsed.score ?? 0))),
          label: parsed.label ?? "중립",
          summary: parsed.summary ?? "",
          keyFactors: parsed.keyFactors ?? [],
          headlines: enrichedHeadlines,
          analyzedAt: new Date(),
        };

        // 3. 캐시 저장
        await saveNewsSummary({
          ticker,
          score: result.score,
          label: result.label,
          summary: result.summary,
          keyFactors: JSON.stringify(result.keyFactors),
          headlines: JSON.stringify(result.headlines),
          analyzedAt: result.analyzedAt,
        });

        return { ...result, isFromCache: false };
      } catch (err) {
        console.warn("[AI Mock] Using mock response due to error", err);
        return {
          score: 0.1,
          label: "중립 (Mock)",
          summary:
            "데이터 수집 중 일시적인 오류가 발생하여 기본 분석 정보를 제공합니다.",
          headlines,
          keyFactors: ["최근 주가 흐름 분석", "실시간 데이터 지연 가능성"],
          analyzedAt: new Date(),
          isFromCache: false,
        };
      }
    }),

  /** 시장 전체 감성 분석 (Global Market Sentiment) - 1시간 캐시 */
  marketSentiment: publicProcedure.query(async () => {
    const { getGeneralNews, cache } = await import("../finnhub");
    const { invokeLLM, parseJsonSafe } = await import("../_core/llm");
    const cacheKey = "globalMarketSentiment";
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      // 1. 다중 카테고리 뉴스 수집 (General + Crypto + Tech)
      const categories = ["general", "crypto", "technology"];
      const newsResults = await Promise.all(
        categories.map(cat => getGeneralNews(cat).catch(() => []))
      );

      const allNews = newsResults.flat();
      const headlines = allNews
        .sort(
          (a, b) =>
            new Date(b.publishedAt || 0).getTime() -
            new Date(a.publishedAt || 0).getTime()
        )
        .slice(0, 25)
        .map(n => n.title);

      // 2. AI 분석
      const prompt = `최근 시장 뉴스 헤드라인들을 분석하여 현재 시장의 분위기를 평가해주세요.
뉴스 헤드라인:
${headlines.join("\n")}

지시 사항:
1. 시장의 전체적인 감성 점수 (-100: 극도 비관, 100: 극도 낙관)를 매기세요.
2. 현재 가장 많이 언급되는 주요 키워드 5개를 추출하세요.
3. 현재 시장 상황을 한 문장으로 요약하세요.
4. 반드시 JSON 형식으로만 응답하세요:
{
  "score": 점수(숫자),
  "label": "공포 | 신중 | 중립 | 낙관 | 환희",
  "keywords": ["키워드1", "키워드2", ...],
  "summary": "시장 요약 문장"
}`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "금융 시장 분석가로서 시장 심리를 분석하여 JSON으로 제공합니다.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const raw = response.choices?.[0]?.message?.content;
      const result = parseJsonSafe(raw);

      // 1시간 캐시 (성공 시에만 저장)
      (cache as any).set(cacheKey, result, 60 * 60 * 1000);
      return result;
    } catch (err) {
      console.error("[MarketSentiment] Analysis failed:", err);
      // 오류 응답은 캐시 저장 안 함 → 1분 후 자동 재시도
      return {
        score: 0,
        label: "중립",
        keywords: ["시장 분석 중"],
        summary: "잠시 후 다시 시도합니다.",
      };
    }
  }),
});
