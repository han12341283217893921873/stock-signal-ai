/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/** 기술적 지표 데이터 */
export interface TechnicalIndicators {
  rsi: number | null;
  macd: number | null;
  macdSignalLine: number | null;
  macdHistogram: number | null;
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  bbUpper?: number | null; // 볼린저 밴드 상단
  bbMiddle?: number | null; // 볼린저 밴드 중간 (20일 MA)
  bbLower?: number | null; // 볼린저 밴드 하단
}

/** OHLCV 캔들 데이터 */
export interface CandleData {
  date: string; // ISO string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5?: number | null;
  ma20?: number | null;
  ma60?: number | null;
  rsi?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHistogram?: number | null;
  bbUpper?: number | null;
  bbMiddle?: number | null;
  bbLower?: number | null;
}

/** 매매 신호 타입 */
export type SignalType = "buy" | "sell" | "neutral" | "hold";

/** 6단계 투자 등급 */
export type SignalGrade =
  | "strong_buy"
  | "buy"
  | "hold"
  | "watch"
  | "sell"
  | "strong_sell";

/** 지표별 점수 기여도 (0~100 스케일, 양수=매수 기여, 음수=매도 기여) */
export interface ScoreBreakdown {
  rsi: number; // RSI 기여 (-25 ~ +25)
  macd: number; // MACD 기여 (-25 ~ +25)
  ma: number; // 이동평균 기여 (-25 ~ +25)
  volume: number; // 거래량 기여 (-10 ~ +10)
  momentum: number; // 가격 모멘텀 기여 (-10 ~ +10)
  bollinger: number; // 볼린저 밴드 기여 (-15 ~ +15)
  fundamental?: number; // 펀더멘털 보너스 (최대 +10)
  sentiment?: number; // AI 뉴스 감성/수급 보너스 (최대 ±20)
  sector?: number; // 섹터 주도성 보너스 (최대 ±15)
  multiTimeframe?: number; // 주봉 추세 보너스 (최대 ±15)
  marketGreed?: number; // 시장 공포/탐욕 보너스 (최대 ±10)
}

/** 매매 신호 */
export interface TradeSignal {
  type: SignalType;
  strength: number; // 0-100
  grade: SignalGrade; // 5단계 등급
  gradeLabel: string; // 한국어 등급명 (예: "강력 매수")
  gradeColor: string; // 테일윈드 CSS 클래스
  reasons: string[]; // 초보자 친화적 설명
  breakdown: ScoreBreakdown; // 지표별 기여도
  summary: string; // 한 줄 요약 (예: "RSI 저평가 + MACD 상승 모멘텀")
  recommendedHold?: string; // "단기(1~3일)", "중장기(수주~수개월)" 등
  strategyLabel?: string; // "스윙 매매", "단타/스캘핑", "가치 투자" 등
}

/** 종목 요약 정보 */
export interface StockSummary {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  signal: TradeSignal;
  indicators: TechnicalIndicators;
  lastUpdated: string;
  currency?: string; // "KRW" | "USD"
  currencySymbol?: string; // "₩" | "$"
  market?: string; // "KOSPI" | "KOSDAQ" | "US"
  isStale?: boolean; // 캐시 만료 후 stale 데이터 반환 여부
  staleMinutesAgo?: number; // 몇 분 전 데이터인지
  fundamentals?: FundamentalMetrics; // 기본적 분석 지표 추가
  tradeGuide?: TradeGuide | null; // 진입/청산 가이드 추가
  sector?: string;
  industry?: string;
  finnhubIndustry?: string;
}

/** 종목 상세 데이터 (차트용) */
export interface StockDetailData {
  ticker: string;
  name: string;
  summary: StockSummary;
  candles: CandleData[];
}

/** AI 뉴스 감성 분석 - 뉴스 헤드라인 아이템 */
export interface NewsHeadlineItem {
  title: string;
  link?: string;
  publishedAt?: string;
}

/** AI 뉴스 감성 분석 결과 */
export interface NewsSentiment {
  score: number; // -1(매우 부정) ~ 1(매우 긍정)
  label: string; // "매우 긍정" | "긍정" | "중립" | "부정" | "매우 부정"
  summary: string; // AI 요약 코멘트
  headlines: NewsHeadlineItem[]; // 분석된 뉴스 헤드라인 목록
  keyFactors?: string[]; // 주요 요인
  analyzedAt: string; // ISO timestamp
}

/** 실시간 상승/하락 주식 순위 아이템 */
export interface TopMover {
  rank: number; // 순위 (1~10)
  ticker: string;
  name: string;
  price: number; // 현재가
  change: number; // 변동액
  changePercent: number; // 변동률 (%)
  volume: number; // 거래량
  market: string; // "US"
}

/** 실시간 상승/하락 주식 순위 결과 */
export interface TopMoversResult {
  gainers: TopMover[]; // 상승 상위 10개
  losers: TopMover[]; // 하락 상위 10개
  timestamp: string; // ISO timestamp
}

/** 진입/청산 가이드 정보 */
export interface TradeGuide {
  entryPrice: number; // 진입 적정가
  targetPrice1: number; // 1차 목표가
  targetPrice2: number; // 2차 목표가
  stopLoss: number; // 손절가
  riskRewardRatio: number; // 리스크/리워드 비율
  positionSizeGuide: string; // 포지션 크기 가이드
  entryCondition: string; // 진입 조건 설명
  exitCondition: string; // 청산 조건 설명
  atr: number; // ATR (평균 실제 범위)
}

/** 거시경제 지표 아이템 */
export interface MacroIndex {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

/** 경제 지표 이벤트 */
export interface EconomicEvent {
  event: string;
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  impact: "high" | "medium" | "low";
  time: string; // ISO or human-readable
  unit: string;
}

/** 공포와 탐욕 지수 데이터 */
export interface FearGreedData {
  score: number; // 0-100
  label: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: string;
}

/** 기업 기본적 분석 지표 */
export interface FundamentalMetrics {
  peRatio?: number;
  pbRatio?: number;
  roe?: number;
  dividendYield?: number;
  marketCap?: number;
  eps?: number;
  revenueGrowth?: number;
}

/** 포트폴리오 리스크 지표 */
export interface PortfolioRisk {
  mdd: number; // Maximum Drawdown (%)
  sharpeRatio: number; // Sharpe Ratio
  volatility: number; // 표준편차 (%)
  totalReturn: number; // 누적 수익률 (%)
}

/** 가중치 기반 AI 추천 전략 */
export interface AiRecommendedStrategy {
  params: Record<string, number>;
  strategyName: string;
  compositeScore: number; // Score = (연환산수익률*0.4) + (승률*0.4) - (MDD*0.2)
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number | null;
  totalTrades: number;
}

/** AI 차트 패턴 인식 결과 */
export interface ChartPattern {
  patternName: string; // 예: "Double Bottom", "Head and Shoulders"
  patternNameKr: string; // 한국어 이름: "쌍바닥", "헤드앤숄더"
  direction: "bullish" | "bearish" | "neutral"; // 예상 방향
  confidence: number; // 0~100 완성도/신뢰도
  description: string; // 패턴 설명 (2~3문장)
  priceTarget: string; // 예상 가격 방향 설명
  keyPoints: string[]; // 핵심 관찰 포인트 (2~4개)
  analyzedAt: string; // ISO timestamp
}

/** 신호 히스토리 아이템 */
export interface SignalHistoryItem {
  id: number;
  ticker: string;
  signalType: SignalType;
  strength: number;
  price: string;
  rsi: string | null;
  macdSignal: string | null;
  reason: string | null;
  aiComment: string | null;
  isRead: number;
  createdAt: Date;
}

/** 상관관계 매트릭스 데이터 */
export interface CorrelationData {
  tickers: string[];
  matrix: number[][]; // N x N matrix of correlation coefficients (-1 to 1)
}

/** 섹터별 퍼포먼스 데이터 */
export interface SectorPerformance {
  sector: string;
  ticker: string;
  returns: {
    "1W": number;
    "1M": number;
    "3M": number;
    YTD: number;
  };
}

/** AI 어시스턴트 메시지 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}
