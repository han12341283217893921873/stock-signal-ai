import {
  protectedProcedure,
  aiProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";
import { z } from "zod";
import {
  getStockSummary,
  getHistoricalData,
  getBasicFinancials,
  getCompanyNews,
} from "../finnhub";
import { getHistoricalDataWithResolution } from "../yahoo";
import { addSignalHistory } from "../db";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";

export const aiRouter = router({
  analyze: protectedProcedure
    .use(aiProcedure._def.middlewares[0])
    .input(
      z.object({
        ticker: z
          .string()
          .min(1)
          .max(20)
          .regex(/^[A-Z0-9.^]{1,20}$/, "올바른 티커 형식이 아닙니다"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ticker = input.ticker.toUpperCase();
      const { cache } = await import("../finnhub");

      const cacheKey = `ai_analyze_${ticker}`;
      const cached = cache.get<any>(cacheKey);
      if (cached) {
        console.log(`[AI] Returning cached analysis for ${ticker}`);
        return cached;
      }

      const [summary, candles, weeklyCandles, hourlyCandles, fundamentals, news] =
        await Promise.all([
          getStockSummary(ticker),
          getHistoricalData(ticker, "6mo"),
          getHistoricalDataWithResolution(ticker, "1wk", "2y"),
          getHistoricalDataWithResolution(ticker, "1h", "1mo"),
          getBasicFinancials(ticker),
          getCompanyNews(ticker, 5),
        ]);

      const recentCandles = candles.slice(-30);
      const signal = summary.signal;
      const indicators = summary.indicators;

      // 신호 강도에 따른 톤 가이드 결정
      const strengthLevel = signal.strength;
      let toneGuide: string;
      let actionTone: string;
      if (signal.type === "neutral") {
        toneGuide =
          "현재 뚜렷한 방향성이 없는 중립 구간입니다. 관망을 권장하는 신중한 톤으로 작성하세요.";
        actionTone = "관망 또는 소량 분할 접근";
      } else if (strengthLevel <= 20) {
        toneGuide = `신호 강도가 ${strengthLevel}/100으로 매우 약합니다. 조건을 겨우 충족한 수준이므로, '신중한 관찰', '소량 분할 매수/매도 고려', '추가 확인 필요' 등 보수적인 표현을 사용하세요. '적극 매수', '강력 추천' 같은 단어는 절대 사용하지 마세요.`;
        actionTone = "소량 분할 접근 또는 추가 확인 후 진입";
      } else if (strengthLevel <= 40) {
        toneGuide = `신호 강도가 ${strengthLevel}/100으로 약~보통 수준입니다. '제한적 매수/매도 고려', '분할 접근 권장' 등 중간 강도의 표현을 사용하세요.`;
        actionTone = "분할 매수/매도 고려";
      } else if (strengthLevel <= 60) {
        toneGuide = `신호 강도가 ${strengthLevel}/100으로 보통 수준입니다. '매수/매도 고려', '비중 확대/축소' 등 적절한 표현을 사용하세요.`;
        actionTone = "매수/매도 고려";
      } else if (strengthLevel <= 80) {
        toneGuide = `신호 강도가 ${strengthLevel}/100으로 강한 편입니다. '적극적 매수/매도 고려', '비중 확대' 등의 표현을 사용할 수 있습니다.`;
        actionTone = "적극적 매수/매도 고려";
      } else {
        toneGuide = `신호 강도가 ${strengthLevel}/100으로 매우 강합니다. 강한 신호이지만 항상 리스크 관리를 강조하세요.`;
        actionTone = "강한 매수/매도 신호";
      }

      const isKR = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
      const macdContext = isKR
        ? `(참고: 한국 주식은 가격 단위가 수만~수십만 원이므로 MACD 절대값이 수백~수천 단위로 크게 나타나는 것이 정상입니다. 방향성과 히스토그램의 부호가 중요합니다.)`
        : `(참고: MACD는 EMA12와 EMA26의 차이값입니다.)`;

      let rsiOverboughtPrompt = "";
      if (indicators.rsi && indicators.rsi >= 70 && signal.type === "buy") {
        rsiOverboughtPrompt = `\n[🚨핵심 필수 지시사항🚨]\n현재 RSI가 ${indicators.rsi.toFixed(2)}로 70 이상인 '과매수' 구간임에도 매수 추천이 발생했습니다. 왜 이 위험(고점 조정 가능성)을 감수하고라도 매수를 추천하는지 그 명확한 근거(예: 강력한 거래량 동반, 전고점 돌파, 강력한 모멘텀, 업계 호재 등)를 'strategy'와 'technicalAnalysis' 항목에 반드시 눈에 띄게 설명하세요. 사용자에게 추천 사유(Logic)를 명확히 납득시켜야 합니다.\n`;
      }

      const prompt = `당신은 전문 주식 기술적 분석가입니다. 다음 데이터를 분석하여 투자자에게 도움이 되는 자연어 기반의 매매 인사이트를 제공해주세요.
${rsiOverboughtPrompt}
[🚨핵심 지시사항🚨]: 사용자는 당신이 제시하는 추천 내용만 믿고 실제 매매를 결정합니다. 따라서 "왜 지금 이 종목을 추천하는지(살지/팔지/관망할지)"에 대한 이유를 매우 디테일하고 정확하게 설명해야 합니다. 막연한 분석을 지양하고, 강력한 모멘텀, 수급, 기술적 타점, 특정 지지/저항선 돌파 등 사용자가 즉각적으로 납득할 수 있는 명확한 근거(Logic)를 상세히 서술하세요.

종목: ${ticker} (${summary.name})
현재가: ${summary.currencySymbol ?? ""}${summary.price.toLocaleString()} (${summary.changePercent > 0 ? "+" : ""}${summary.changePercent.toFixed(2)}%)
거래량: ${summary.volume.toLocaleString()}

기술적 지표:
- RSI(14): ${indicators.rsi ?? "N/A"} ${indicators.rsi != null ? (indicators.rsi > 70 ? "→ 과매수 경계" : indicators.rsi < 30 ? "→ 과매도 구간" : indicators.rsi > 60 ? "→ 강세 구간" : indicators.rsi < 40 ? "→ 약세 구간" : "→ 중립 구간") : ""}
- MACD: ${indicators.macd ?? "N/A"} / Signal: ${indicators.macdSignalLine ?? "N/A"} / Histogram: ${indicators.macdHistogram ?? "N/A"} ${macdContext}
- MA5: ${indicators.ma5 ?? "N/A"} / MA20: ${indicators.ma20 ?? "N/A"} / MA60: ${indicators.ma60 ?? "N/A"}

현재 매매 신호: ${signal.type === "buy" ? "매수" : signal.type === "sell" ? "매도" : "중립"} (강도: ${signal.strength}/100)
권장 행동 수준: ${actionTone}
신호 근거: ${signal.reasons.join(", ")}

기본적 분석 (Fundamentals):
- PER: ${fundamentals?.peRatio?.toFixed(2) ?? "N/A"}
- PBR: ${fundamentals?.pbRatio?.toFixed(2) ?? "N/A"}
- ROE: ${fundamentals?.roe?.toFixed(2) ?? "N/A"}%
- 배당수익률: ${fundamentals?.dividendYield?.toFixed(2) ?? "N/A"}%
- 매출성장률: ${fundamentals?.revenueGrowth?.toFixed(2) ?? "N/A"}%

최근 실시간 뉴스 헤드라인 (호재/악재 판독용):
${news && news.length > 0 ? news.map(n => `- ${n.headline}`).join("\n") : "- 최근 뉴스 없음"}

다중 타임프레임 데이터:
- 주봉(Weekly) 추이: ${weeklyCandles
        .slice(-10)
        .map(c => c.close.toLocaleString())
        .join(" -> ")}
- 시간봉(Hourly) 최근 흐름: ${hourlyCandles
        .slice(-10)
        .map(c => c.close.toLocaleString())
        .join(" -> ")}
- 일봉(Daily) 최근 30일 종가: ${recentCandles.map(c => c.close.toLocaleString()).join(", ")}

다음 형식의 JSON으로만 응답하세요:
{
  "summary": "시장 상황 요약 (2-3문장)",
  "simpleConclusion": "비전문가용 한 줄 요약 (예: '지금은 사기 좋은 시기입니다' 또는 '조금 더 지켜보는 것이 안전합니다')",
  "detailedReasoning": "종목 추천에 대한 구체적이고 디테일한 근거 (왜 지금 사야/팔아야/관망해야 하는지 핵심 이유를 개조식으로 3가지 이상 매우 구체적으로 나열)",
  "technicalAnalysis": "지표 및 다중 타임프레임 해석 (일봉/주봉/시간봉 비교 포함, 과매수 상태일 경우 위험 대비 매수 근거 필수 포함)",
  "fundamentalAnalysis": "기본적 분석 지표 해석 및 밸류에이션 평가",
  "strategy": "매매 전략 제안 및 추천 사유(Logic) 명시 (진입 시점, 비중 조절 및 고집하는 이유 등)",
  "investmentTerm": "투자 기간 (예: 단기, 중기, 장기)",
  "holdingPeriod": "권장 보유 기간 (구체적인 기간, 예: 1-2주, 3개월 이상 등)",
  "investmentStyle": "투자 스타일 (예: 가치투자, 모멘텀, 스윙, 배당성장 등)",
  "priceStrategy": {
    "buyPrice": "추천 진입가 (숫자만 또는 범위)",
    "targetPrice": "목표가 (숫자만)",
    "stopLoss": "손절가 (숫자만)",
    "reason": "가격 설정 근거"
  },
  "risks": "리스크 요인 (매크로 및 개별 리스크)",
  "disclaimer": "면책 고지"
}

전문적이면서도 이해하기 쉬운 한국어로 작성해주세요.`;

      let rawContent = "";
      let simpleConclusion = "";
      let priceStrategy: any = null;
      try {
        if (!ENV.openAiApiKey && ENV.forgeApiKey === "forge-api-key-here") {
          throw new Error("Mock AI Response");
        }
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "당신은 전문 주식 분석가입니다. 반드시 유효한 JSON으로만 답변하세요.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(
          typeof content === "string" ? content : JSON.stringify(content)
        );

        rawContent = `**💡 상세 추천 사유 (Logic)**\n${parsed.detailedReasoning || "상세 사유 분석 불가"}\n\n**1. 시장 상황 요약**\n${parsed.summary}\n\n**2. 기술적 및 다중 타임프레임 분석**\n${parsed.technicalAnalysis}\n\n**3. 기본적 분석 및 밸류에이션**\n${parsed.fundamentalAnalysis}\n\n**4. 매매 전략**\n${parsed.strategy}\n\n**5. 리스크 요인**\n${parsed.risks}\n\n${parsed.disclaimer}`;
        simpleConclusion = parsed.simpleConclusion || parsed.summary.split(".")[0];
        priceStrategy = {
          ...parsed.priceStrategy,
          investmentTerm: parsed.investmentTerm,
          holdingPeriod: parsed.holdingPeriod,
          investmentStyle: parsed.investmentStyle,
        };
      } catch (err) {
        console.warn("[AI Mock] Using mock response due to error", err);
        simpleConclusion = `${ticker} 종목은 현재 ${signal.type === "buy" ? "매수하기 좋은" : signal.type === "sell" ? "주의가 필요한" : "관망하기 적당한"} 상태입니다.`;
        rawContent = `[💡 모의 AI 분석 리포트]\n\n**1. 시장 상황 요약**\n${ticker} 종목은 현재 ${signal.type === "buy" ? "긍정적인" : signal.type === "sell" ? "부정적인" : "혼조세의"} 흐름을 보이고 있습니다.\n\n**2. 기술적 지표 해석**\nRSI는 ${indicators.rsi ?? "N/A"} 수준이며 변곡점에 위치해 있습니다.\n\n**3. 매매 전략**\n- 권장 행동: **${actionTone}**\n\n**4. 리스크 요인**\n단기 변동성에 유의하십시오.\n\n*면책 고지: 기술적 지표 기반 참고 정보입니다.*`;

        // Mock price strategy based on trade guide
        const guide = summary.tradeGuide;
        priceStrategy = {
          buyPrice: summary.price.toString(),
          targetPrice:
            guide?.targetPrice1.toString() ?? (summary.price * 1.1).toFixed(0),
          stopLoss:
            guide?.stopLoss.toString() ?? (summary.price * 0.95).toFixed(0),
          reason: "기술적 지표 및 변동성 기반 산출 (Mock)",
          investmentTerm: "단기/중기",
          holdingPeriod: "2주 ~ 1개월",
          investmentStyle: "모멘텀 스윙",
        };
      }

      const aiComment = rawContent || "AI 분석을 생성할 수 없습니다.";

      const result = {
        ticker,
        name: summary.name,
        signal,
        indicators,
        aiComment,
        simpleConclusion,
        priceStrategy,
        price: summary.price,
        changePercent: summary.changePercent,
      };

      cache.set(cacheKey, result, 2 * 60 * 60 * 1000); // 2 hours

      // 백그라운드 태스크 (Non-blocking)
      (async () => {
        try {
          // 1. 히스토리 저장
          await addSignalHistory({
            userId: ctx.user.id,
            ticker,
            signalType: signal.type,
            strength: signal.strength,
            price: summary.price,
            rsi: indicators.rsi ?? null,
            macdSignal: signal.type,
            reason: signal.reasons.join(" | "),
            aiComment,
          });

          // 2. 텔레그램 알림 전송 (Feature 36)
          const { sendTelegramMessage } = await import("../_core/telegram");
          const { getCurrencyInfo } = await import("../finnhub");
          const curr = getCurrencyInfo(ticker);
          const msg = `🚀 *Stock Signal AI 분석 완료*
종목: ${ticker} (${summary.name})
현재가: ${curr.symbol}${summary.price.toLocaleString()} (${summary.changePercent.toFixed(2)}%)
신호: *${signal.gradeLabel}* (강도: ${signal.strength})
          
📊 *AI 분석 요약*
${aiComment.slice(0, 200)}...
          
🎯 *추천 전략*
진입: ${priceStrategy?.buyPrice || "-"}
목표: ${priceStrategy?.targetPrice || "-"}
손절: ${priceStrategy?.stopLoss || "-"}
          
자세한 내용은 앱에서 확인하세요!`;
          await sendTelegramMessage(msg);
        } catch (err) {
          console.error("[AI Background Task] Failed:", err);
        }
      })();

      return result;
    }),

  /** AI 차트 시각 분석 (Vision) */
  analyzeChart: protectedProcedure
    .use(aiProcedure._def.middlewares[0])
    .input(
      z.object({
        ticker: z.string(),
        image: z.string(), // base64 encoded image
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `${input.ticker} 종목의 기술적 차트 이미지입니다. 
        차트의 캔들 패턴, 이동평균선(MA), 거래량, 보조지표(RSI, MACD 등)를 시각적으로 분석해주세요.
        현재 어떤 추세에 있는지, 그리고 기술적 분석 관점에서 매수/매매 중 어떤 것이 유리해 보이는지 전문 애널리스트의 시각으로 설명해주세요.
        추가 컨텍스트: ${input.context || "없음"}`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "당신은 차트 이미지를 분석하는 시각 전문 금융 애널리스트입니다.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: input.image } },
            ],
          },
        ],
      });

      return {
        analysis: response.choices[0].message.content,
        analyzedAt: new Date(),
      };
    }),

  /** 멀티 AI 교차 검증 (Gemini + Claude + DeepSeek) */
  crossCheck: protectedProcedure
    .use(aiProcedure._def.middlewares[0])
    .input(
      z.object({
        ticker: z.string(),
        marketContext: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { invokeMultiLLM } = await import("../_core/llm");

      const prompt = `${input.ticker} 종목에 대해 분석해주세요.
        시장 상황: ${input.marketContext}
        현재 데이터와 추세를 고려할 때 단기/중기적 관점에서 어떤 판단이 가장 합리적인지 3문장 이내로 답변하세요.`;

      const results = await invokeMultiLLM(
        {
          messages: [
            { role: "system", content: "간결하고 명확한 주식 분석가입니다." },
            { role: "user", content: prompt },
          ],
        },
        ["gemini", "anthropic", "deepseek"]
      );

      return results;
    }),

  /** AI 자율 심층 리서치 (Deep-Dive) */
  deepDive: protectedProcedure
    .use(aiProcedure._def.middlewares[0])
    .input(z.object({ ticker: z.string() }))
    .mutation(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const { getCompanyNews, getStockSummary, getBasicFinancials } =
        await import("../finnhub");

      const [summary, news, fundamentals] = await Promise.all([
        getStockSummary(ticker),
        getCompanyNews(ticker, 30), // 최근 30일 뉴스
        getBasicFinancials(ticker),
      ]);

      const prompt = `당신은 세계 최고의 주식 리서치 애널리스트입니다. ${ticker} (${summary.name}) 종목에 대해 심층 리서치 보고서를 작성해주세요.
      
      제공된 데이터:
      - 현재가: ${summary.price}
      - 재무지표: ${JSON.stringify(fundamentals)}
      - 최근 뉴스 헤드라인: ${news
        .slice(0, 15)
        .map(n => n.title)
        .join(" | ")}
      
      보고서에는 다음 내용이 반드시 포함되어야 합니다:
      1. 기업 개요 및 핵심 비즈니스 모델 분석
      2. 최근 주요 뉴스 및 공시를 통한 모멘텀 분석
      3. 재무 건전성 및 밸류에이션 매력도 평가
      4. 향후 6~12개월 전망 및 목표가 제안
      5. 강력한 투자 매력 포인트(Bull Case)와 핵심 리스크(Bear Case)
      
      매우 전문적이고 깊이 있는 통찰력을 담아 한국어로 상세히 작성해주세요. 마크다운 형식을 사용하여 가독성 있게 구성하세요.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "당신은 기관 투자자 수준의 보고서를 작성하는 주식 전략가입니다.",
          },
          { role: "user", content: prompt },
        ],
        // 심층 리서치를 위해 더 긴 토큰 허용
        max_tokens: 2500,
      });

      return {
        report: response.choices[0].message.content,
        ticker,
        analyzedAt: new Date(),
      };
    }),

  /** 재무 이상 감지 (Financial Red Flags) */
  detectAnomalies: protectedProcedure
    .input(z.object({ ticker: z.string() }))
    .mutation(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const { getBasicFinancials, getStockSummary } = await import(
        "../finnhub"
      );

      const [fundamentals, summary] = await Promise.all([
        getBasicFinancials(ticker),
        getStockSummary(ticker),
      ]);

      const prompt = `${ticker} (${summary.name})의 재무 데이터를 바탕으로 '재무 건전성 및 이상 징후(Red Flags)'를 진단해주세요.
      
      재무 데이터:
      ${JSON.stringify(fundamentals)}
      
      다음 항목들을 중점적으로 체크하세요:
      1. 부채 비율 및 유동성 위험 (이자 보상 배율 등)
      2. 매출 채권이나 재고자산의 비정상적 증가 여부
      3. 영업 현금 흐름 대비 순이익의 괴리 (분식회계 가능성)
      4. 최근 수익성 악화 추세
      
      진단 결과를 JSON 형식으로 응답하세요:
      {
        "riskLevel": "Low" | "Medium" | "High" | "Critical",
        "score": number (0~100, 높을수록 위험),
        "flags": [
          { "type": "warning" | "danger", "title": "항목명", "description": "상세 설명" }
        ],
        "summary": "종합 평가 한 줄"
      }`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "당신은 기업의 재무제표를 샅샅이 뒤져 위험 요소를 찾아내는 포렌식 회계 전문가입니다.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      return {
        ...parsed,
        ticker,
        analyzedAt: new Date(),
      };
    }),

  /** 소셜 감성 분석 (Social Buzz - Feature 38) */
  socialSentiment: protectedProcedure
    .input(z.object({ ticker: z.string() }))
    .mutation(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const { getCompanyNews, getStockSummary } = await import("../finnhub");

      const [news, summary] = await Promise.all([
        getCompanyNews(ticker, 3),
        getStockSummary(ticker),
      ]);

      const prompt = `${ticker} 종목에 대한 최근 소셜 미디어(X, Reddit, 커뮤니티)의 분위기를 분석해주세요.
      최근 뉴스: ${news.map(n => n.title).join(" | ")}
      현재 주가 흐름: ${summary.changePercent}%
      
      결과를 JSON으로 응답하세요:
      {
        "buzzScore": number (0~100),
        "sentiment": "Positive" | "Negative" | "Neutral",
        "trendingKeywords": string[],
        "summary": "소셜 반응 요약"
      }`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "소셜 미디어 트렌드 분석가입니다." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      return {
        ...JSON.parse(response.choices[0].message.content),
        ticker,
        analyzedAt: new Date(),
      };
    }),

  /** AI 허브: 실적 콜 요약 */
  earningsSummary: protectedProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .mutation(async ({ input }) => {
      const ticker = input.ticker.toUpperCase();
      const { getCompanyNews, getBasicFinancials, getStockSummary } =
        await import("../finnhub");
      const [news, fundamentals, summary] = await Promise.all([
        getCompanyNews(ticker, 30),
        getBasicFinancials(ticker),
        getStockSummary(ticker),
      ]);
      const headlines = news
        .slice(0, 15)
        .map((n: any) => n.title)
        .join(" | ");
      const prompt = `${ticker} (${summary.name}) 종목의 최근 실적 발표 및 기업 동향을 분석해주세요.

최근 뉴스 헤드라인: ${headlines || "뉴스 없음"}
재무 지표: PER=${fundamentals?.peRatio?.toFixed(1) ?? "N/A"}, 매출성장률=${fundamentals?.revenueGrowth?.toFixed(1) ?? "N/A"}%, ROE=${fundamentals?.roe?.toFixed(1) ?? "N/A"}%
현재 주가: ${summary.price} (${summary.changePercent?.toFixed(2)}%)

JSON 형식으로만 응답:
{
  "title": "종목명 + 최근 분기 실적 제목",
  "publishedAt": "분석 날짜",
  "sentiment": "Positive" | "Neutral" | "Negative",
  "bullishPoints": ["긍정 요인1", "긍정 요인2", "긍정 요인3"],
  "bearishPoints": ["우려 요인1", "우려 요인2"],
  "guidance": "향후 가이던스 또는 전망 한 문장"
}`;
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "기업 실적 분석 전문가입니다. 반드시 JSON으로만 응답하세요.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        const parsed = JSON.parse(response.choices[0].message.content);
        return { ...parsed, ticker, analyzedAt: new Date() };
      } catch {
        return {
          ticker,
          title: `${ticker} 실적 분석`,
          publishedAt: new Date().toLocaleDateString("ko-KR"),
          sentiment: "Neutral",
          bullishPoints: ["뉴스 기반 분석 진행 중", "재무 데이터 분석 중"],
          bearishPoints: ["시장 변동성 주의"],
          guidance: "추가 데이터 수집 후 분석 예정",
          analyzedAt: new Date(),
        };
      }
    }),

  /** AI 허브: 종목 배틀 (두 종목 비교) */
  peerComparison: protectedProcedure
    .input(
      z.object({
        tickerA: z.string().min(1).max(20),
        tickerB: z.string().min(1).max(20),
      })
    )
    .mutation(async ({ input }) => {
      const tickerA = input.tickerA.toUpperCase();
      const tickerB = input.tickerB.toUpperCase();
      const { getBasicFinancials, getStockSummary } = await import(
        "../finnhub"
      );
      const [sumA, sumB, fundA, fundB] = await Promise.all([
        getStockSummary(tickerA),
        getStockSummary(tickerB),
        getBasicFinancials(tickerA),
        getBasicFinancials(tickerB),
      ]);
      const prompt = `두 종목을 심층 비교 분석해주세요.

${tickerA} (${sumA.name}): 현재가=${sumA.price}, 변동률=${sumA.changePercent?.toFixed(2)}%, RSI=${sumA.indicators?.rsi?.toFixed(1)}, 신호=${sumA.signal?.gradeLabel}, PER=${fundA?.peRatio?.toFixed(1)}, 매출성장률=${fundA?.revenueGrowth?.toFixed(1)}%
${tickerB} (${sumB.name}): 현재가=${sumB.price}, 변동률=${sumB.changePercent?.toFixed(2)}%, RSI=${sumB.indicators?.rsi?.toFixed(1)}, 신호=${sumB.signal?.gradeLabel}, PER=${fundB?.peRatio?.toFixed(1)}, 매출성장률=${fundB?.revenueGrowth?.toFixed(1)}%

JSON으로만 응답:
{
  "gradeA": "Strong Buy" | "Buy" | "Hold" | "Sell",
  "gradeB": "Strong Buy" | "Buy" | "Hold" | "Sell",
  "momentumA": "한 줄 성장 모멘텀",
  "momentumB": "한 줄 성장 모멘텀",
  "rsiA": "RSI 해석",
  "rsiB": "RSI 해석",
  "winner": "${tickerA}" | "${tickerB}",
  "conclusion": "2~3문장 종합 평가"
}`;
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "주식 비교 분석 전문가입니다. JSON으로만 응답하세요.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        const parsed = JSON.parse(response.choices[0].message.content);
        return {
          ...parsed,
          tickerA,
          tickerB,
          nameA: sumA.name,
          nameB: sumB.name,
          priceA: sumA.price,
          priceB: sumB.price,
          rsiNumA: sumA.indicators?.rsi,
          rsiNumB: sumB.indicators?.rsi,
          analyzedAt: new Date(),
        };
      } catch {
        return {
          tickerA,
          tickerB,
          nameA: sumA.name,
          nameB: sumB.name,
          gradeA: sumA.signal?.gradeLabel || "Hold",
          gradeB: sumB.signal?.gradeLabel || "Hold",
          momentumA: "분석 중",
          momentumB: "분석 중",
          rsiA: `RSI ${sumA.indicators?.rsi?.toFixed(1)}`,
          rsiB: `RSI ${sumB.indicators?.rsi?.toFixed(1)}`,
          priceA: sumA.price,
          priceB: sumB.price,
          winner: tickerA,
          conclusion: "두 종목 모두 추가 분석이 필요합니다.",
          analyzedAt: new Date(),
        };
      }
    }),

  /** AI 허브: AI 테마 발굴 (스캐너 결과 기반 실시간) */
  themeDiscovery: publicProcedure.query(async () => {
    const { cache } = await import("../finnhub");
    const cacheKey = "ai_theme_discovery";
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    const HOT_THEMES = [
      {
        name: "AI 반도체",
        tickers: ["NVDA", "AMD", "INTC", "AVGO", "MU"],
        query: "AI semiconductor GPU",
      },
      {
        name: "바이오/헬스케어",
        tickers: ["LLY", "NVO", "MRNA", "ABBV", "BMY"],
        query: "biotech healthcare GLP-1",
      },
      {
        name: "클라우드/SaaS",
        tickers: ["MSFT", "GOOGL", "AMZN", "CRM", "NOW"],
        query: "cloud software AI",
      },
      {
        name: "전기차/배터리",
        tickers: ["TSLA", "LI", "RIVN", "QS", "ENVX"],
        query: "EV battery electric vehicle",
      },
      {
        name: "방산/우주",
        tickers: ["LMT", "RTX", "NOC", "RKLB", "ASTS"],
        query: "defense aerospace",
      },
    ];

    const { getBasicFinancials, getStockSummary } = await import("../finnhub");

    const themes = await Promise.all(
      HOT_THEMES.map(async theme => {
        let totalReturn = 0;
        let count = 0;
        for (const ticker of theme.tickers.slice(0, 3)) {
          try {
            const s = await getStockSummary(ticker);
            totalReturn += s.changePercent || 0;
            count++;
          } catch {}
        }
        const avgReturn = count > 0 ? totalReturn / count : 0;
        return {
          name: theme.name,
          trend: `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}%`,
          hotness: Math.min(99, Math.max(20, Math.round(50 + avgReturn * 5))),
          stocks: theme.tickers.slice(0, 4),
          isPositive: avgReturn >= 0,
        };
      })
    );

    const best = themes.sort((a, b) => b.hotness - a.hotness)[0];
    let analysisText = `${best.name} 테마가 현재 가장 주목받고 있습니다.`;
    try {
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "시장 테마 분석가입니다. 간결하게 한국어로 응답하세요.",
          },
          {
            role: "user",
            content: `현재 ${best.name} 관련 주식 (${best.stocks.join(",")})이 평균 ${best.trend} 움직이고 있습니다. 이 테마의 투자 매력을 2문장으로 분석해주세요.`,
          },
        ],
      });
      analysisText = resp.choices[0].message.content || analysisText;
    } catch {}

    const result = {
      themes: themes.sort((a, b) => b.hotness - a.hotness),
      featuredTheme: best.name,
      analysis: analysisText,
      updatedAt: new Date(),
    };
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  }),

  /** AI 허브: 스마트 머니 트래커 (내부자 매매) */
  smartMoneyTracker: publicProcedure.query(async () => {
    const { cache } = await import("../finnhub");
    const cacheKey = "smart_money_tracker";
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    const WATCH_TICKERS = [
      "NVDA",
      "META",
      "AAPL",
      "MSFT",
      "GOOGL",
      "TSLA",
      "AMZN",
    ];
    const { getInsiderTransactions, getStockSummary } = await import(
      "../finnhub"
    );

    const allInsider: any[] = [];
    for (const ticker of WATCH_TICKERS) {
      try {
        const transactions = await getInsiderTransactions(ticker);
        if (transactions && transactions.length > 0) {
          const recent = transactions.slice(0, 2).map((t: any) => ({
            ticker,
            name: t.name,
            shares: t.share,
            value: Math.abs(t.share * (t.price || 0)),
            type: t.transactionCode === "P" ? "BUY" : "SELL",
            date: t.transactionDate,
          }));
          allInsider.push(...recent);
        }
      } catch {}
    }

    const bigBuys = allInsider
      .filter(t => t.type === "BUY")
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    const bigSells = allInsider
      .filter(t => t.type === "SELL")
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const result = { bigBuys, bigSells, updatedAt: new Date() };
    cache.set(cacheKey, result, 60 * 60 * 1000);
    return result;
  }),

  /** 대시보드 통합 요약 (비전문가용) */
  dashboardSummary: protectedProcedure
    .input(z.object({ tickers: z.array(z.string()).max(10) }))
    .query(async ({ input }) => {
      const { tickers } = input;
      const { getStockSummary, cache } = await import("../finnhub");
      const { macroRouter } = await import("./macro");

      const cacheKey = `dashboard_summary_${tickers.join("_")}`;
      const cached = cache.get<any>(cacheKey);
      if (cached) return cached;

      // 1. 매크로 데이터 가져오기
      const { getDailyBriefing } = await import("./macro");
      const macro = await getDailyBriefing();

      // 2. 종목 데이터 가져오기 (상위 5개만 상세히)
      const summaries = await Promise.all(
        tickers.slice(0, 5).map(t => getStockSummary(t).catch(() => null))
      );
      const validSummaries = summaries.filter(s => s !== null);

      const stockContext = validSummaries
        .map(
          s =>
            `${s!.name}: ${s!.changePercent >= 0 ? "+" : ""}${s!.changePercent.toFixed(1)}% (${s!.signal.gradeLabel})`
        )
        .join(", ");

      const prompt = `당신은 주식을 처음 시작하는 사람에게 시장 상황을 설명해주는 친절한 가이드입니다. 
      다음 데이터를 바탕으로 오늘 시장의 분위기와 사용자의 관심 종목 상태를 '일상적인 언어'로 3문장 이내로 요약해주세요. 
      전문 용어(RSI, MACD 등)를 절대 사용하지 말고, "오늘은 시장이 활기차네요", "조금 조심해야 할 날이에요" 같은 느낌으로 답변하세요.

      [시장 브리핑]
      ${macro?.summary || "데이터 없음"}
      
      [사용자 관심 종목 현황]
      ${stockContext || "관심 종목 없음"}
      
      JSON으로 응답: { "simpleSummary": "요약 내용", "mood": "happy" | "calm" | "warn" | "neutral" }`;

      try {
        const { invokeLLM } = await import("../_core/llm");
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "친절한 주식 가이드 AI입니다." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        const result = {
          ...parsed,
          updatedAt: new Date(),
        };
        cache.set(cacheKey, result, 1 * 60 * 60 * 1000); // 1시간 캐시
        return result;
      } catch (err) {
        return {
          simpleSummary: "현재 시장은 전반적으로 평온한 흐름을 보이고 있습니다. 관심 종목들을 천천히 살펴보세요.",
          mood: "neutral",
          updatedAt: new Date(),
        };
      }
    }),

  /** 종목 비교 AI 배틀 분석 */
  compareStocks: protectedProcedure
    .input(z.object({ ticker1: z.string(), ticker2: z.string() }))
    .mutation(async ({ input }) => {
      const { ticker1, ticker2 } = input;
      const { getStockSummary } = await import("../finnhub");
      const { invokeLLM } = await import("../_core/llm");

      const [s1, s2] = await Promise.all([
        getStockSummary(ticker1).catch(() => null),
        getStockSummary(ticker2).catch(() => null),
      ]);

      if (!s1 || !s2) {
        throw new Error("한 개 이상의 종목 정보를 불러올 수 없습니다.");
      }

      const prompt = `당신은 두 주식 종목을 비교하여 우열을 가려주는 AI 심판입니다.
      아래 두 종목의 데이터를 비교하여 어떤 종목이 '현재 시점에서' 더 유망한지 판정하고 그 이유를 설명해주세요.

      [종목 1: ${s1.ticker}(${s1.name})]
      - 가격: ${s1.price}, 등락률: ${s1.changePercent}%
      - AI 신호: ${s1.signal.gradeLabel} (강도 ${s1.signal.strength})
      - 주요 지표: RSI ${s1.indicators.rsi?.toFixed(1)}, MACD ${s1.indicators.macd?.toFixed(2)}

      [종목 2: ${s2.ticker}(${s2.name})]
      - 가격: ${s2.price}, 등락률: ${s2.changePercent}%
      - AI 신호: ${s2.signal.gradeLabel} (강도 ${s2.signal.strength})
      - 주요 지표: RSI ${s2.indicators.rsi?.toFixed(1)}, MACD ${s2.indicators.macd?.toFixed(2)}

      [지시 사항]
      1. 각 종목의 장단점을 1문장씩 기술하세요.
      2. 최종 승자(Winner)를 한 종목 선정하세요. (무승부 가능)
      3. 비전문가가 이해하기 쉽게 "이 종목은 ~해서 더 좋습니다"라고 결론을 내려주세요.
      
      JSON으로 응답:
      {
        "winner": "${ticker1}" | "${ticker2}" | "DRAW",
        "verdict": "최종 판정 요약 (2문장)",
        "comparison": [
          { "category": "신호 강도", "s1": "상세내용", "s2": "상세내용", "better": 1 | 2 | 0 },
          { "category": "차트 상태", "s1": "상세내용", "s2": "상세내용", "better": 1 | 2 | 0 },
          { "category": "리스크", "s1": "상세내용", "s2": "상세내용", "better": 1 | 2 | 0 }
        ]
      }`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "종목 비교 전문 AI 심판입니다." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content);
    }),

  /** 4. 자연어 퀀트 봇 메이커 (No-Code Quant) */
  generateQuantScanner: protectedProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const prompt = `사용자가 자연어로 주식 검색 조건(퀀트 봇)을 요청했습니다: "${input.prompt}"
이 요청을 분석하여, 다음 JSON 형식의 스캐너 필터 조건으로 변환해 주세요.

응답 형식 (반드시 유효한 JSON만 출력):
{
  "market": "us" | "kr" | "all",
  "minScore": 0~100 사이의 숫자 (기본 0),
  "rsiRange": { "min": 0~100 사이의 숫자, "max": 0~100 사이의 숫자 },
  "signalFilter": "all" | "buy" | "sell",
  "explanation": "이 조건식이 어떻게 설정되었는지 사용자에게 설명하는 친절한 한국어 문장 (예: '워런 버핏의 가치투자 철학에 맞게 RSI가 낮아 저평가되었으며 매수 신호가 뜨는 미국 종목을 찾도록 설정했습니다.')"
}

요청에 명시되지 않은 조건은 일반적인 상식선에서 가장 적합하게 추론하거나 제한을 두지 마세요(예: RSI 0~100).`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "당신은 주식 스캐너 조건식을 생성하는 퀀트 봇 메이커입니다." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        
        return JSON.parse(response.choices[0].message.content) as {
          market: "us" | "kr" | "all";
          minScore: number;
          rsiRange: { min: number; max: number };
          signalFilter: "all" | "buy" | "sell";
          explanation: string;
        };
      } catch (err) {
        console.error("Quant parsing failed", err);
        throw new Error("자연어 조건을 해석하는 중 오류가 발생했습니다.");
      }
    }),
});
