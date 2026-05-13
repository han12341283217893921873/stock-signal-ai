/** 공통 마켓 유틸 — 순환 import 방지를 위해 별도 모듈로 분리 */

export function isKoreanTicker(ticker: string): boolean {
  return ticker.endsWith(".KS") || ticker.endsWith(".KQ");
}

export function getCurrencyInfo(ticker: string): {
  currency: string;
  symbol: string;
  locale: string;
} {
  if (isKoreanTicker(ticker)) {
    return { currency: "KRW", symbol: "₩", locale: "ko-KR" };
  }
  return { currency: "USD", symbol: "$", locale: "en-US" };
}

export function getMarketLabel(ticker: string): string {
  if (ticker.endsWith(".KS")) return "KOSPI";
  if (ticker.endsWith(".KQ")) return "KOSDAQ";
  return "US";
}
