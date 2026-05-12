import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getScanCache, US_SCAN_TICKERS, KR_SCAN_TICKERS, ScanResult } from "../scanner";
import { getStockSummary } from "../finnhub";

/**
 * 가치-심리 괴리 전략 (Value-Sentiment Divergence Strategy)
 * 기업의 펀더멘털은 우량하나(AI 고득점), 시장의 공포로 인해 가격이 과매도된 종목을 발굴합니다.
 */

interface DivergenceStock extends ScanResult {
  divergenceScore: number;
  fundamentalScore: number;
  technicalBonus: number;
  tier: 1 | 2;
  comment: string;
}

export const divergenceRouter = router({
  /** 괴리율 기반 상위 종목 조회 */
  list: publicProcedure
    .input(z.object({ 
      market: z.enum(["us", "kr", "all"]).default("us"),
      limit: z.number().default(20)
    }))
    .query(async ({ input }) => {
      const cache = getScanCache(input.market);
      let candidates = cache.results;

      // 만약 스캔 결과가 없으면, 인기 종목 몇 개를 실시간으로 가져와서 보여줌 (최소 출력 보장)
      if (candidates.length === 0) {
        const defaultTickers = input.market === "kr" 
          ? ["005930.KS", "000660.KS", "035420.KS", "005380.KS", "035720.KS"]
          : ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "DELL", "COIN", "ASML", "LRCX", "DAL"];
        
        const summaries = await Promise.allSettled(
          defaultTickers.map(t => getStockSummary(t))
        );
        
        candidates = summaries
          .filter((s): s is PromiseFulfilledResult<any> => s.status === "fulfilled")
          .map(s => {
            const sum = s.value;
            return {
              ticker: sum.ticker,
              name: sum.name,
              price: sum.price,
              changePercent: sum.changePercent,
              currency: sum.currency,
              currencySymbol: sum.currencySymbol,
              market: input.market,
              signalType: sum.signal.type,
              signalStrength: sum.signal.strength,
              signalGrade: sum.signal.gradeLabel,
              signalReasons: sum.signal.reasons,
              rsi: sum.indicators.rsi,
              macd: sum.indicators.macd,
              ma5: sum.indicators.ma5,
              ma20: sum.indicators.ma20,
              bollinger: sum.indicators.bbLower ? {
                lower: sum.indicators.bbLower,
                upper: sum.indicators.bbUpper,
                middle: sum.indicators.bbMiddle
              } : null,
              scannedAt: new Date().toISOString()
            } as any;
          });
      }

      // ── 전략 스코어링 로직 ──
      const scoredResults: DivergenceStock[] = candidates.map(c => {
        // 1. Fundamental Score (60%) - AI 점수 기반
        // 매수 신호일 때 점수가 높을수록 가점, 매도 신호면 기본 점수 낮춤
        const baseAiScore = c.signalStrength;
        const fundamentalScore = c.signalType === "buy" ? baseAiScore : baseAiScore * 0.4;
        
        // 2. Technical Bonus (40%) - 과매도 지표 기반
        let technicalBonus = 0;
        
        // A. 볼린저 밴드 하단 근접도 (최대 25점)
        // (현재가 - 하단) / (상단 - 하단) -> 0에 가까울수록(하단 터치) 고득점
        if (c.bollinger && c.bollinger.upper !== c.bollinger.lower) {
          const pos = (c.price - c.bollinger.lower) / (c.bollinger.upper - c.bollinger.lower);
          const bbScore = Math.max(0, (1 - pos) * 25);
          technicalBonus += bbScore;
        } else if (c.price <= (c.ma20 ?? 0) * 0.95) { // 볼린저 없으면 이평선 이격도로 대체
          technicalBonus += 15;
        }

        // B. RSI 과매도 가산점 (최대 15점)
        if (c.rsi != null) {
          // RSI 30 이하면 만점, 70 이상이면 0점
          const rsiScore = Math.max(0, (70 - c.rsi) / 40 * 15);
          technicalBonus += rsiScore;
        }

        // 최종 합산 (상대 평가를 위해 100점 만점으로 스케일링 권장하나 여기서는 절대합산 후 정렬)
        const totalScore = (fundamentalScore * 0.6) + (technicalBonus * 0.4);

        // 티어 분류
        // Tier 1: 가치도 높고(AI 60↑) 저점 신호도 강함(보너스 20↑)
        const isTier1 = fundamentalScore >= 60 && technicalBonus >= 20;
        
        // 코멘트 생성
        let comment = "";
        if (isTier1) {
          comment = `AI 점수(${fundamentalScore.toFixed(0)}점)가 매우 높고, `;
          if (c.rsi && c.rsi < 35) comment += "RSI 과매도 구간이며 ";
          comment += "주가가 바닥권에 도달하여 강력한 반등이 기대됩니다.";
        } else if (fundamentalScore >= 70) {
          comment = `기업 가치는 훌륭하나(${fundamentalScore.toFixed(0)}점), 아직 기술적 저점 신호가 완성되지 않아 분할 매수로 접근이 유효합니다.`;
        } else {
          comment = `가치와 가격의 괴리가 발생한 종목으로 추세 전환 확인 후 진입을 권장합니다.`;
        }

        return {
          ...c,
          fundamentalScore: Number(fundamentalScore.toFixed(1)),
          technicalBonus: Number(technicalBonus.toFixed(1)),
          divergenceScore: Number(totalScore.toFixed(1)),
          tier: isTier1 ? 1 : 2,
          comment
        };
      });

      // 점수순 정렬
      const sorted = scoredResults.sort((a, b) => b.divergenceScore - a.divergenceScore);

      return {
        timestamp: new Date().toISOString(),
        market: input.market,
        totalCandidates: candidates.length,
        // 최소 5개 보장 (이미 candidates에서 보장함)
        items: sorted.slice(0, input.limit)
      };
    })
});
