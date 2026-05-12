import { getStockSummary, getHistoricalData, generateSignal } from "../finnhub";
import { getMarketWeather, MacroWeather } from "./MacroDefense";
import { getSectorRadar, SectorStatus } from "./SectorRadar";
import { getSpeedRadar, SpeedMetric } from "./SentimentRadar";
import { getHedgeSuggestions, HedgeSuggestion, analyzeCorrelation } from "./RiskProtector";

export interface AdvancedAnalysisResult {
  ticker: string;
  name: string;
  baseScore: number;
  finalScore: number;
  marketWeather: MacroWeather;
  sectorStatus: SectorStatus | null;
  speedMetric: SpeedMetric;
  hedgeSuggestions: HedgeSuggestion[];
  warnings: string[];
  recommendation: string;
}

/**
 * 차세대 투자 분석 엔진 (Ultimate Investment Partner Engine)
 * 방패(매크로), 레이더(섹터/심리), 창(기술적 지표)을 하나로 통합합니다.
 */
export async function runAdvancedAnalysis(ticker: string): Promise<AdvancedAnalysisResult> {
  // 1. 기초 데이터 및 하위 엔진 병렬 실행
  const [summary, marketWeather, sectorRadar, speedMetric] = await Promise.all([
    getStockSummary(ticker),
    getMarketWeather(),
    getSectorRadar(),
    getSpeedRadar(ticker)
  ]);

  // 2. 섹터 매칭
  const sector = sectorRadar.find(s => s.name.toLowerCase().includes((summary as any).sector?.toLowerCase() ?? ""));
  
  // 3. 최종 점수 조정 로직
  let finalScore = summary.signal.strength;
  if (summary.signal.type === 'sell') finalScore *= -1; // 매도 신호면 음수로 처리

  let warnings: string[] = [];

  // A. 매크로 패널티 적용
  if (marketWeather.penalty < 0) {
    finalScore += marketWeather.penalty;
    if (marketWeather.status === 'storm') {
      warnings.push(`🌪️ 시장 기상 악화: ${marketWeather.reason}`);
    }
  }

  // B. 섹터 리스크 적용
  if (sector?.isMeltdown) {
    finalScore -= 10;
    warnings.push(`⚠️ 섹터 동반 하락 감지: ${sector.name} 산업군 전체에 강한 매도세가 흐르고 있습니다.`);
  }

  // C. 실시간 심리 가중치 적용
  finalScore += (speedMetric.sentimentScore * 0.5); // 심리 가중치 50% 반영
  finalScore += (speedMetric.orderBookImbalance * 2); // 호가창 불균형 반영

  // D. 헤지 제안
  const hedgeSuggestions = await getHedgeSuggestions(marketWeather.status);

  // E. 최종 권고안 도출
  let recommendation = "";
  if (finalScore >= 60) recommendation = "강력 매수 (적극적 진입 권장)";
  else if (finalScore >= 30) recommendation = "매수 (분할 매수 유효)";
  else if (finalScore >= -30) recommendation = "관망 (추세 확인 필요)";
  else recommendation = "매도 및 현금화 (리스크 관리 우선)";

  return {
    ticker,
    name: summary.name,
    baseScore: summary.signal.strength,
    finalScore: Number(finalScore.toFixed(1)),
    marketWeather,
    sectorStatus: sector ?? null,
    speedMetric,
    hedgeSuggestions,
    warnings,
    recommendation
  };
}
