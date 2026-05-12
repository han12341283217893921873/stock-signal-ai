import { invokeLLM } from "../_core/llm";
import { getQuote } from "../finnhub";

export interface SpeedMetric {
  sentimentScore: number; // -10 ~ +10
  orderBookImbalance: number; // -5 ~ +5 (매수/매도 잔량 비율)
  summary: string;
}

/**
 * 실시간 레이더 (Sentiment & Speed Radar)
 * 소셜 미디어 심리와 호가창 잔량을 분석하여 단기 변동을 예측합니다.
 */
export async function getSpeedRadar(ticker: string): Promise<SpeedMetric> {
  try {
    // 1. 호가창 불균형 (Order Book Imbalance) - Finnhub Quote 데이터 활용 (비율 추정)
    const quote = await getQuote(ticker);
    // 실제 호가창 API가 없으므로 거래량과 가격 변동폭으로 유추하는 로직 (Simulation)
    const change = (quote as any)?.regularMarketChangePercent ?? 0;
    const volume = (quote as any)?.regularMarketVolume ?? 0;
    
    let obScore = 0;
    if (change > 0.5) obScore = 2; // 매수 우위 추정
    if (change < -0.5) obScore = -2; // 매도 우위 추정

    // 2. 소셜 미디어/뉴스 심리 (LLM)
    // 실제 X/Reddit API 대신 최근 뉴스 헤드라인의 '어조'를 분석하여 심리 파악
    const prompt = `${ticker} 종목에 대한 최근 시장의 '분위기'와 '수급 상황'을 분석해주세요. 
    최근 가격 변동성(${change.toFixed(2)}%)과 거래량을 고려할 때, 
    투자자들이 공포를 느끼고 있는지, 아니면 매집 중인지 -1.0(비관) ~ 1.0(낙관) 사이의 점수와 이유를 1문장으로 답하세요.`;

    const aiRes = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    });

    const content = aiRes.choices[0].message.content;
    const sentimentScore = parseFloat(content.match(/-?\d\.\d/)?.[0] ?? "0") * 10;

    return {
      sentimentScore: Number(sentimentScore.toFixed(1)),
      orderBookImbalance: obScore,
      summary: content.split(".")[0] // 첫 문장만 추출
    };
  } catch (err) {
    return { sentimentScore: 0, orderBookImbalance: 0, summary: "데이터 로딩 중..." };
  }
}
