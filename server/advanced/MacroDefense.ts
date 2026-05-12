import { getQuote, getFearGreedIndex } from "../finnhub";

export interface MacroWeather {
  score: number; // 0 ~ 100 (100 is perfect, 0 is disaster)
  penalty: number; // 0 ~ -30 pt
  status: "clear" | "cloudy" | "storm";
  reason: string;
}

/**
 * 매크로 방어 엔진 (Macro Defense Engine)
 * 거시 경제 지표를 분석하여 전체 시장의 위험도를 산출합니다.
 */
export async function getMarketWeather(): Promise<MacroWeather> {
  try {
    const [vix, yield10y, usdKrw, fearGreed] = await Promise.all([
      getQuote("^VIX"),
      getQuote("^TNX"),
      getQuote("KRW=X"),
      getFearGreedIndex()
    ]);

    const vixPrice = (vix as any)?.regularMarketPrice ?? 15;
    const yieldPrice = (yield10y as any)?.regularMarketPrice ?? 4.0;
    const currencyPrice = (usdKrw as any)?.regularMarketPrice ?? 1350;
    const fgScore = fearGreed.score ?? 50;

    let totalPenalty = 0;
    let reasons: string[] = [];

    // 1. VIX Penalty (공포 지수)
    if (vixPrice > 25) {
      totalPenalty -= 15;
      reasons.push("공포지수(VIX) 급등");
    } else if (vixPrice > 20) {
      totalPenalty -= 8;
      reasons.push("VIX 변동성 증가");
    }

    // 2. Yield Penalty (국채 금리)
    if (yieldPrice > 4.5) {
      totalPenalty -= 10;
      reasons.push("고금리 부담 지속");
    }

    // 3. Currency Penalty (환율 - 특히 한국 주식 영향)
    if (currencyPrice > 1400) {
      totalPenalty -= 10;
      reasons.push("환율 리스크 심각");
    } else if (currencyPrice > 1380) {
      totalPenalty -= 5;
      reasons.push("원화 약세");
    }

    // 4. Fear & Greed Penalty
    if (fgScore < 30) {
      totalPenalty -= 5;
      reasons.push("시장 심리 극도의 공포");
    }

    const finalPenalty = Math.max(-30, totalPenalty);
    const score = Math.max(0, 100 + finalPenalty * 2.5); // 0~100 스케일링

    let status: MacroWeather["status"] = "clear";
    if (finalPenalty <= -20) status = "storm";
    else if (finalPenalty <= -8) status = "cloudy";

    return {
      score,
      penalty: finalPenalty,
      status,
      reason: reasons.length > 0 ? reasons.join(", ") : "시장 기상도 맑음"
    };
  } catch (err) {
    console.error("[MacroDefense] Error:", err);
    return { score: 100, penalty: 0, status: "clear", reason: "데이터 수집 불가 (중립 유지)" };
  }
}
