import { getQuote } from "../finnhub";

export interface HedgeSuggestion {
  ticker: string;
  name: string;
  reason: string;
  weight: number; // 포트폴리오 대비 추천 비중 (0~10%)
}

/**
 * 리스크 관리 모듈 (Risk Protector)
 * 시장 하락 시 헤지 종목을 추천하고 상관관계를 분석합니다.
 */
export async function getHedgeSuggestions(marketStatus: "clear" | "cloudy" | "storm"): Promise<HedgeSuggestion[]> {
  if (marketStatus === "clear") return [];

  const suggestions: HedgeSuggestion[] = [];

  if (marketStatus === "storm") {
    suggestions.push({
      ticker: "SQQQ",
      name: "ProShares UltraPro Short QQQ",
      reason: "시장 급락 시 나스닥 하락폭의 3배 수익 추구 (강력 헤지)",
      weight: 10
    });
    suggestions.push({
      ticker: "SH",
      name: "ProShares Short S&P500",
      reason: "S&P 500 하락에 베팅하여 포트폴리오 하단 방어",
      weight: 5
    });
  } else if (marketStatus === "cloudy") {
    suggestions.push({
      ticker: "GLD",
      name: "SPDR Gold Shares",
      reason: "시장 불확실성 증가에 따른 안전자산(금) 비중 확대",
      weight: 5
    });
    suggestions.push({
      ticker: "VIXY",
      name: "ProShares VIX Short-Term Futures",
      reason: "변동성 증가에 따른 보험 성격의 자산 배분",
      weight: 3
    });
  }

  return suggestions;
}

/** 종목 간 상관관계 분석 (MOCK - 실제 구현 시 과거 수익률 데이터 필요) */
export function analyzeCorrelation(tickers: string[]): { warning: string | null } {
  // 예: NVDA, AMD, AVGO가 모두 있으면 반도체 집중 경고
  const semiconductor = ["NVDA", "AMD", "AVGO", "INTC", "MU", "LRCX", "ASML", "AMAT"];
  const count = tickers.filter(t => semiconductor.includes(t)).length;
  
  if (count >= 3) {
    return { warning: "⚠️ 반도체 섹터 집중도가 매우 높습니다. 섹터 악재 시 동반 하락 위험이 큽니다." };
  }
  
  return { warning: null };
}
