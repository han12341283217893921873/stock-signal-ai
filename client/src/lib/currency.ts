/**
 * 공통 통화(Currency) 유틸리티
 * 한국 주식(.KS / .KQ)은 ₩(KRW), 미국 주식은 $(USD)로 표시
 */

/** 티커가 한국 주식인지 판별 */
export function isKoreanTicker(ticker: string): boolean {
  return ticker.endsWith(".KS") || ticker.endsWith(".KQ");
}

/** 티커로부터 통화 심볼 반환 */
export function getCurrencySymbol(ticker: string): string {
  return isKoreanTicker(ticker) ? "₩" : "$";
}

/** 통화 코드(currency string)로부터 통화 심볼 반환 */
export function getCurrencySymbolFromCode(currency?: string): string {
  return currency === "KRW" ? "₩" : "$";
}

/** 통화 옵션 타입 */
interface FormatPriceOptions {
  /** 통화 코드 ("KRW" | "USD"). ticker가 없을 때 사용 */
  currency?: string;
  /** 소수점 자리수 (USD 기본값: 2, KRW 기본값: 0) */
  decimals?: number;
}

/**
 * 가격을 통화 심볼과 함께 포맷
 * @param price 숫자 가격
 * @param ticker 종목 티커 (한국 주식 자동 감지)
 * @param options 옵션 (currency, decimals)
 */
export function formatPrice(
  price: number,
  ticker?: string,
  options: FormatPriceOptions = {}
): string {
  const isKRW =
    (ticker && isKoreanTicker(ticker)) || options.currency === "KRW";
  const symbol = isKRW ? "₩" : "$";

  if (isKRW) {
    const decimals = options.decimals ?? 0;
    return `${symbol}${price.toLocaleString("ko-KR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  } else {
    const decimals = options.decimals ?? 2;
    return `${symbol}${price.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
}

/**
 * 포트폴리오처럼 혼합 통화일 때, 통화 심볼만 반환
 * (currency prop 또는 ticker 기반)
 */
export function resolveCurrencySymbol(
  ticker?: string,
  currency?: string
): string {
  if (currency) return getCurrencySymbolFromCode(currency);
  if (ticker) return getCurrencySymbol(ticker);
  return "$";
}
