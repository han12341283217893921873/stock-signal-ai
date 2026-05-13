import YahooFinance from "yahoo-finance2";
import { getKisKRQuote, getKisKRCandles } from "./kis.js";
import type {
  CandleData,
  TechnicalIndicators,
  TradeSignal,
  StockSummary,
  SignalGrade,
  SignalType,
  ScoreBreakdown,
} from "../shared/types";

// yahoo-finance2 v3 requires instantiation
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ─── Market Helpers ─────────────────────────────────────────────────────────

/** Detect if a ticker is Korean (KRX) */
export function isKoreanTicker(ticker: string): boolean {
  return ticker.endsWith(".KS") || ticker.endsWith(".KQ");
}

/** Get currency symbol for display */
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

/** Get market label */
export function getMarketLabel(ticker: string): string {
  if (ticker.endsWith(".KS")) return "KOSPI";
  if (ticker.endsWith(".KQ")) return "KOSDAQ";
  return "US";
}

// ─── Popular Korean Stocks for Quick Search ─────────────────────────────────

const POPULAR_KR_STOCKS: { ticker: string; name: string; nameKo: string }[] = [
  { ticker: "005930.KS", name: "Samsung Electronics", nameKo: "삼성전자" },
  { ticker: "000660.KS", name: "SK Hynix", nameKo: "SK하이닉스" },
  { ticker: "373220.KS", name: "LG Energy Solution", nameKo: "LG에너지솔루션" },
  { ticker: "005380.KS", name: "Hyundai Motor", nameKo: "현대자동차" },
  { ticker: "000270.KS", name: "Kia", nameKo: "기아" },
  { ticker: "068270.KS", name: "Celltrion", nameKo: "셀트리온" },
  { ticker: "035420.KS", name: "NAVER", nameKo: "네이버" },
  { ticker: "035720.KS", name: "Kakao", nameKo: "카카오" },
  { ticker: "051910.KS", name: "LG Chem", nameKo: "LG화학" },
  { ticker: "006400.KS", name: "Samsung SDI", nameKo: "삼성SDI" },
  { ticker: "055550.KS", name: "Shinhan Financial", nameKo: "신한지주" },
  { ticker: "105560.KS", name: "KB Financial", nameKo: "KB금융" },
  { ticker: "003670.KS", name: "Posco Holdings", nameKo: "포스코홀딩스" },
  { ticker: "012330.KS", name: "Hyundai Mobis", nameKo: "현대모비스" },
  { ticker: "066570.KS", name: "LG Electronics", nameKo: "LG전자" },
  { ticker: "028260.KS", name: "Samsung C&T", nameKo: "삼성물산" },
  { ticker: "003550.KS", name: "LG", nameKo: "LG" },
  { ticker: "034730.KS", name: "SK Inc", nameKo: "SK" },
  { ticker: "096770.KS", name: "SK Innovation", nameKo: "SK이노베이션" },
  { ticker: "030200.KS", name: "KT", nameKo: "KT" },
  { ticker: "017670.KS", name: "SK Telecom", nameKo: "SK텔레콤" },
  { ticker: "032830.KS", name: "Samsung Life", nameKo: "삼성생명" },
  {
    ticker: "009150.KS",
    name: "Samsung Electro-Mechanics",
    nameKo: "삼성전기",
  },
  { ticker: "010130.KS", name: "Korea Zinc", nameKo: "고려아연" },
  { ticker: "247540.KS", name: "Ecopro BM", nameKo: "에코프로비엠" },
  { ticker: "086520.KS", name: "Ecopro", nameKo: "에코프로" },
  { ticker: "352820.KS", name: "Hive", nameKo: "하이브" },
  { ticker: "259960.KS", name: "Krafton", nameKo: "크래프톤" },
  { ticker: "263750.KS", name: "Pearl Abyss", nameKo: "펄어비스" },
  { ticker: "036570.KS", name: "NCsoft", nameKo: "엔씨소프트" },
];

/** Search Korean stocks by Korean name or code */
function searchKoreanLocal(
  query: string
): { ticker: string; name: string; exchange: string; type: string }[] {
  const q = query.toLowerCase().trim();
  return POPULAR_KR_STOCKS.filter(
    s =>
      s.nameKo.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.ticker.toLowerCase().includes(q)
  )
    .slice(0, 10)
    .map(s => ({
      ticker: s.ticker,
      name: `${s.nameKo} (${s.name})`,
      exchange: s.ticker.endsWith(".KS") ? "KOSPI" : "KOSDAQ",
      type: "EQUITY",
    }));
}

/** Check if query looks like Korean (contains Hangul or is a 6-digit code) */
function isKoreanQuery(query: string): boolean {
  // Contains Korean characters
  if (/[\uAC00-\uD7AF]/.test(query)) return true;
  // 6-digit number (Korean stock code)
  if (/^\d{6}$/.test(query.trim())) return true;
  return false;
}

// ─── TTL Cache ───────────────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTLMs;
    // Periodic cleanup every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /** 만료된 캐시도 반환 (오류 시 stale fallback용) */
  getStale<T>(key: string): { data: T; expiredAt: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return { data: entry.data as T, expiredAt: entry.expiresAt };
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry && now > entry.expiresAt) this.store.delete(key);
    }
  }
}

// 5분 기본 TTL - Yahoo Finance 호출 빈도 제한
const cache = new TTLCache(5 * 60 * 1000);

// ─── 장 개장 여부 판단 ───────────────────────────────────────────────────────
function isUSMarketOpen(): boolean {
  const now = new Date();
  // UTC 기준: 미국 동부 정규장 13:30~20:00 UTC (서머타임 적용)
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const day = now.getUTCDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return false; // 주말
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 13 * 60 + 30 && totalMinutes < 20 * 60;
}

export function isKRMarketOpen(): boolean {
  const now = new Date();
  // UTC 기준: 한국 정규장 09:00~15:30 KST = 00:00~06:30 UTC
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const day = now.getUTCDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return false; // 주말
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 0 && totalMinutes < 6 * 60 + 30;
}

/** 미국 또는 한국 장 중 하나라도 열려 있으면 true */
export function isAnyMarketOpen(): boolean {
  return isUSMarketOpen() || isKRMarketOpen();
}

/** 현재 열려 있는 장 이름 반환 */
export function getOpenMarketName(): string | null {
  if (isUSMarketOpen()) return "US";
  if (isKRMarketOpen()) return "KR";
  return null;
}

/** 장중이면 짧은 TTL, 장외이면 긴 TTL 반환 */
function getQuoteTTL(): number {
  return isAnyMarketOpen() ? 2 * 1000 : 5 * 60 * 1000; // 장중 2초, 장외 5분
}

function getSummaryTTL(): number {
  return isAnyMarketOpen() ? 20 * 1000 : 5 * 60 * 1000; // 장중 20초, 장외 5분
}

// ─── 백그라운드 프리페치 레지스트리 ──────────────────────────────────────────
const prefetchTickers = new Set<string>();

/** 워치리스트 종목을 백그라운드에서 미리 갱신 */
export function registerPrefetchTicker(ticker: string) {
  prefetchTickers.add(ticker.toUpperCase());
}
export function unregisterPrefetchTicker(ticker: string) {
  prefetchTickers.delete(ticker.toUpperCase());
}

// 장중에는 15초마다, 장외에는 5분마다 등록된 종목 프리페치
setInterval(async () => {
  if (prefetchTickers.size === 0) return;
  const tickers = Array.from(prefetchTickers);
  for (const ticker of tickers) {
    try {
      const cacheKey = `quote:${ticker}`;
      const cached = cache.get<any>(cacheKey);
      if (!cached) {
        // KIS는 속도 제한 없이 즉시 호출, 야후는 기존 제한 유지
        let quote;
        if (isKoreanTicker(ticker)) {
          quote = await getQuote(ticker); // getQuote 내부에 KIS 로직 있음
        } else {
          quote = await rateLimitedCall(() => yahooFinance.quote(ticker));
        }
        cache.set(cacheKey, quote, getQuoteTTL());
      }
    } catch {
      /* 개별 실패는 무시 */
    }
  }
}, 15 * 1000);

// Rate limiter: 최소 1.2초 간격으로 Yahoo Finance 호출 (약간 빠르게)
let lastCallTime = 0;
let lastCallPromise = Promise.resolve();

async function rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
  const resultPromise = lastCallPromise.then(async () => {
    const now = Date.now();
    const elapsed = now - lastCallTime;
    if (elapsed < 600) {
      await new Promise(r => setTimeout(r, 600 - elapsed));
    }
    lastCallTime = Date.now();
    return fn();
  });
  lastCallPromise = resultPromise.then(() => {}).catch(() => {});
  return resultPromise as Promise<T>;
}

// ─── Yahoo Finance Data Fetching ─────────────────────────────────────────────

export async function getQuote(ticker: string) {
  const cacheKey = `quote:${ticker}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  // 한국 주식인 경우 KIS 시도 후 실패 시 Yahoo Fallback
  if (isKoreanTicker(ticker)) {
    try {
      const kisQuote = await getKisKRQuote(ticker);
      if (kisQuote) {
        console.log(`[DATA] Using KIS real-time quote for ${ticker}`);
        
        // Try to get name from Yahoo or cache
        const nameCacheKey = `name:${ticker}`;
        let stockName = cache.get<string>(nameCacheKey);
        if (!stockName) {
           const stock = POPULAR_KR_STOCKS.find(s => s.ticker === ticker);
           if (stock) {
             stockName = stock.nameKo || stock.name;
           } else {
             try {
               const yQuote = await rateLimitedCall(() => yahooFinance.quote(ticker));
               stockName = yQuote.shortName || yQuote.longName || ticker;
             } catch {
               stockName = ticker;
             }
           }
           cache.set(nameCacheKey, stockName, 24 * 60 * 60 * 1000); // cache for 24h
        }

        const formatted = {
          symbol: ticker,
          shortName: stockName,
          regularMarketPrice: kisQuote.price,
          regularMarketChange: kisQuote.change,
          regularMarketChangePercent: kisQuote.changePercent,
          regularMarketDayHigh: kisQuote.high,
          regularMarketDayLow: kisQuote.low,
          regularMarketOpen: kisQuote.open,
          regularMarketVolume: kisQuote.volume,
          currency: "KRW",
        };
        cache.set(cacheKey, formatted, getQuoteTTL());
        return formatted;
      }
    } catch (err) {
      console.error(
        `[KIS] Error fetching quote for ${ticker}, falling back to Yahoo:`,
        (err as Error).message
      );
      // Fall through to Yahoo
    }
  }

  try {
    const quote = await rateLimitedCall(() => yahooFinance.quote(ticker));
    cache.set(cacheKey, quote, getQuoteTTL()); // 장중 15초, 장외 5분
    return quote;
  } catch (err) {
    console.error(`[Yahoo] Failed to fetch quote for ${ticker}:`, err);
    throw new Error(`Failed to fetch quote for ${ticker}`);
  }
}

/** 기업 프로필 조회 (섹터, 산업군 등) */
export async function getCompanyProfile(ticker: string) {
  const cacheKey = `profile:${ticker}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const result = await rateLimitedCall(() =>
      yahooFinance.quoteSummary(ticker, { modules: ["summaryProfile"] })
    );
    const profile = result?.summaryProfile;
    if (profile) {
      cache.set(cacheKey, profile, 7 * 24 * 60 * 60 * 1000); // 7일 캐시
      return profile;
    }
    return null;
  } catch (err) {
    console.warn(
      `[Yahoo] Profile fetch failed for ${ticker}:`,
      (err as Error).message
    );
    return null;
  }
}

export async function getHistoricalData(
  ticker: string,
  period: string = "6mo"
): Promise<CandleData[]> {
  const cacheKey = `history:${ticker}:${period}`;
  const cached = cache.get<CandleData[]>(cacheKey);
  if (cached) return cached;

  // 한국 주식인 경우 KIS 시도 후 실패 시 Yahoo Fallback
  if (isKoreanTicker(ticker)) {
    try {
      const kisCandles = await getKisKRCandles(ticker, period);
      if (kisCandles && kisCandles.length > 0) {
        const enriched = enrichWithIndicators(kisCandles);
        cache.set(cacheKey, enriched, 10 * 60 * 1000);
        return enriched;
      }
    } catch (err) {
      console.error(
        `[KIS] Error fetching history for ${ticker}, falling back to Yahoo:`,
        (err as Error).message
      );
      // Fall through to Yahoo
    }
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case "1mo":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "3mo":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "6mo":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "2y":
        startDate.setFullYear(startDate.getFullYear() - 2);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 6);
    }

    const result: any = await rateLimitedCall(() =>
      yahooFinance.chart(ticker, {
        period1: startDate,
        period2: endDate,
        interval: "1d" as const,
      })
    );

    const isKR = isKoreanTicker(ticker);
    const candles: CandleData[] = (result.quotes || [])
      .filter((q: any) => q.open != null && q.close != null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString(),
        open: isKR ? Math.round(q.open) : Number(q.open?.toFixed(2) ?? 0),
        high: isKR ? Math.round(q.high) : Number(q.high?.toFixed(2) ?? 0),
        low: isKR ? Math.round(q.low) : Number(q.low?.toFixed(2) ?? 0),
        close: isKR ? Math.round(q.close) : Number(q.close?.toFixed(2) ?? 0),
        volume: q.volume ?? 0,
      }));

    // 기술적 지표 계산 후 병합
    const enriched = enrichWithIndicators(candles);
    cache.set(cacheKey, enriched, 10 * 60 * 1000); // 10분 캐시
    return enriched;
  } catch (err) {
    console.error(`[Yahoo] Failed to fetch history for ${ticker}:`, err);
    throw new Error(`Failed to fetch historical data for ${ticker}`);
  }
}

/** 다양한 타임프레임(1h, 1d, 1wk 등)의 히스토리 데이터 조회 */
export async function getHistoricalDataWithResolution(
  ticker: string,
  resolution: "1h" | "1d" | "1wk" | "1mo" = "1d",
  period: string = "6mo"
): Promise<CandleData[]> {
  const cacheKey = `history:${ticker}:${resolution}:${period}`;
  const cached = cache.get<CandleData[]>(cacheKey);
  if (cached) return cached;

  try {
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case "1mo":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "3mo":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "6mo":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "2y":
        startDate.setFullYear(startDate.getFullYear() - 2);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 6);
    }

    // 시간봉은 기간 제한 (Yahoo Finance API 제한)
    if (
      resolution === "1h" &&
      endDate.getTime() - startDate.getTime() > 30 * 24 * 60 * 60 * 1000
    ) {
      startDate.setTime(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const result: any = await rateLimitedCall(() =>
      yahooFinance.chart(ticker, {
        period1: startDate,
        period2: endDate,
        interval: resolution as any,
      })
    );

    const isKR = isKoreanTicker(ticker);
    const candles: CandleData[] = (result.quotes || [])
      .filter((q: any) => q.open != null && q.close != null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString(),
        open: isKR ? Math.round(q.open) : Number(q.open?.toFixed(2) ?? 0),
        high: isKR ? Math.round(q.high) : Number(q.high?.toFixed(2) ?? 0),
        low: isKR ? Math.round(q.low) : Number(q.low?.toFixed(2) ?? 0),
        close: isKR ? Math.round(q.close) : Number(q.close?.toFixed(2) ?? 0),
        volume: q.volume ?? 0,
      }));

    const enriched = enrichWithIndicators(candles);
    cache.set(cacheKey, enriched, 10 * 60 * 1000);
    return enriched;
  } catch (err) {
    console.error(
      `[Yahoo] Failed to fetch history (${resolution}) for ${ticker}:`,
      err
    );
    return [];
  }
}

// ─── Technical Indicators ────────────────────────────────────────────────────

function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(
        Number((slice.reduce((a, b) => a + b, 0) / period).toFixed(2))
      );
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(Number(sma.toFixed(4)));
    } else {
      const prev = result[i - 1]!;
      const ema = (data[i] - prev) * multiplier + prev;
      result.push(Number(ema.toFixed(4)));
    }
  }
  return result;
}

function calculateRSI(
  closes: number[],
  period: number = 14
): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => null);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First RSI calculation
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < period; i++) result.push(null);

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(Number((100 - 100 / (1 + rs)).toFixed(2)));

  // Subsequent RSI calculations
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    result.push(Number(rsi.toFixed(2)));
  }

  return result;
}

function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] != null && emaSlow[i] != null) {
      macdLine.push(Number((emaFast[i]! - emaSlow[i]!).toFixed(4)));
    } else {
      macdLine.push(null);
    }
  }

  // Signal line = EMA of MACD line
  const validMacd = macdLine.filter(v => v != null) as number[];
  const signalEma = calculateEMA(validMacd, signalPeriod);

  const signal: (number | null)[] = [];
  const histogram: (number | null)[] = [];
  let validIdx = 0;

  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] == null) {
      signal.push(null);
      histogram.push(null);
    } else {
      const sig = signalEma[validIdx] ?? null;
      signal.push(sig != null ? Number(sig.toFixed(4)) : null);
      histogram.push(
        macdLine[i] != null && sig != null
          ? Number((macdLine[i]! - sig).toFixed(4))
          : null
      );
      validIdx++;
    }
  }

  return { macd: macdLine, signal, histogram };
}

function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || middle[i] == null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const variance =
        slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
      const stdDev = Math.sqrt(variance);
      upper.push(Number((mean + stdDevMultiplier * stdDev).toFixed(2)));
      lower.push(Number((mean - stdDevMultiplier * stdDev).toFixed(2)));
    }
  }
  return { upper, middle, lower };
}

function enrichWithIndicators(candles: CandleData[]): CandleData[] {
  const closes = candles.map(c => c.close);
  const ma5 = calculateSMA(closes, 5);
  const ma20 = calculateSMA(closes, 20);
  const ma60 = calculateSMA(closes, 60);
  const rsi = calculateRSI(closes);
  const { macd, signal, histogram } = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20, 2);

  return candles.map((c, i) => ({
    ...c,
    ma5: ma5[i],
    ma20: ma20[i],
    ma60: ma60[i],
    rsi: rsi[i],
    macd: macd[i],
    macdSignal: signal[i],
    macdHistogram: histogram[i],
    bbUpper: bb.upper[i],
    bbMiddle: bb.middle[i],
    bbLower: bb.lower[i],
  }));
}

// ─── Signal Generation ───────────────────────────────────────────────────────

// ─── Signal Grade Helpers ────────────────────────────────────────────────────

function gradeFromScore(score: number): {
  grade: SignalGrade;
  gradeLabel: string;
  gradeColor: string;
  type: SignalType;
} {
  if (score >= 60)
    return {
      grade: "strong_buy",
      gradeLabel: "강력 매수",
      gradeColor: "text-emerald-400",
      type: "buy",
    };
  if (score >= 35)
    return {
      grade: "buy",
      gradeLabel: "매수",
      gradeColor: "text-green-400",
      type: "buy",
    };
  if (score >= -35)
    return {
      grade: "watch",
      gradeLabel: "관망",
      gradeColor: "text-yellow-400",
      type: "neutral",
    };
  if (score >= -60)
    return {
      grade: "sell",
      gradeLabel: "매도",
      gradeColor: "text-orange-400",
      type: "sell",
    };
  return {
    grade: "strong_sell",
    gradeLabel: "강력 매도",
    gradeColor: "text-red-400",
    type: "sell",
  };
}

// 최근 N개 캔들에서 연속 증가/감소 카운트
function countConsecutive(
  arr: (number | null | undefined)[],
  n: number
): number {
  const vals = arr.slice(-n).filter((v): v is number => v != null);
  if (vals.length < 2) return 0;
  let up = 0,
    down = 0;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] > vals[i - 1]) up++;
    else if (vals[i] < vals[i - 1]) down++;
    else {
      up = 0;
      down = 0;
    }
  }
  return up > down ? up : -down;
}

export function generateSignal(candles: CandleData[]): TradeSignal {
  const emptyBreakdown: ScoreBreakdown = {
    rsi: 0,
    macd: 0,
    ma: 0,
    volume: 0,
    momentum: 0,
    bollinger: 0,
  };

  if (candles.length < 5) {
    const { grade, gradeLabel, gradeColor, type } = gradeFromScore(0);
    return {
      type,
      strength: 0,
      grade,
      gradeLabel,
      gradeColor,
      reasons: ["데이터가 부족하여 신호를 계산할 수 없습니다."],
      breakdown: emptyBreakdown,
      summary: "데이터 부족",
    };
  }

  const latest = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev3 = candles.slice(-5); // 최근 5개 캔들
  const reasons: string[] = [];
  const bd: ScoreBreakdown = {
    rsi: 0,
    macd: 0,
    ma: 0,
    volume: 0,
    momentum: 0,
    bollinger: 0,
  };

  // ── 1. RSI (최대 ±25) ──────────────────────────────────────────────────────
  if (latest.rsi != null) {
    const rsi = latest.rsi;
    const prevRsi = prev.rsi ?? rsi;
    const rsiTrend = rsi - prevRsi; // 방향성

    if (rsi <= 25) {
      bd.rsi = 25;
      reasons.push(
        `📉 RSI ${rsi.toFixed(1)} — 극도로 저평가된 구간입니다. 반등 가능성이 높습니다.`
      );
    } else if (rsi <= 35) {
      bd.rsi = 18;
      reasons.push(
        `📉 RSI ${rsi.toFixed(1)} — 저평가 구간에 근접했습니다. 매수 기회를 탐색할 시점입니다.`
      );
    } else if (rsi <= 45) {
      bd.rsi = 8 + (rsiTrend > 0 ? 4 : 0);
      reasons.push(
        `📊 RSI ${rsi.toFixed(1)} — 중립 하단 구간입니다.${rsiTrend > 0 ? " 상승 반전 시도 중입니다." : ""}`
      );
    } else if (rsi <= 55) {
      bd.rsi = rsiTrend > 0 ? 5 : -5;
      reasons.push(
        `📊 RSI ${rsi.toFixed(1)} — 균형 구간입니다.${rsiTrend > 0 ? " 상승 모멘텀이 형성되고 있습니다." : " 방향성을 확인 중입니다."}`
      );
    } else if (rsi <= 65) {
      bd.rsi = -8 + (rsiTrend < 0 ? -4 : 0);
      reasons.push(
        `📈 RSI ${rsi.toFixed(1)} — 강세 구간입니다.${rsiTrend < 0 ? " 상승 탄력이 둔화되고 있습니다." : ""}`
      );
    } else if (rsi <= 75) {
      bd.rsi = -18;
      reasons.push(
        `⚠️ RSI ${rsi.toFixed(1)} — 고평가 구간에 진입했습니다. 단기 조정 가능성이 있습니다.`
      );
    } else {
      bd.rsi = -25;
      reasons.push(
        `🔴 RSI ${rsi.toFixed(1)} — 극도로 고평가된 구간입니다. 매도 또는 익절을 고려하세요.`
      );
    }
  }

  // ── 2. MACD (최대 ±25) ────────────────────────────────────────────────────
  if (
    latest.macd != null &&
    latest.macdSignal != null &&
    prev.macd != null &&
    prev.macdSignal != null
  ) {
    const prevDiff = prev.macd - prev.macdSignal;
    const currDiff = latest.macd - latest.macdSignal;
    const histTrend = countConsecutive(
      prev3.map(c => c.macdHistogram),
      5
    );

    if (prevDiff <= 0 && currDiff > 0) {
      bd.macd = 25;
      reasons.push(
        "✅ MACD 골든크로스 발생 — 하락에서 상승으로 전환되는 강력한 매수 신호입니다."
      );
    } else if (prevDiff >= 0 && currDiff < 0) {
      bd.macd = -25;
      reasons.push(
        "🔴 MACD 데드크로스 발생 — 상승에서 하락으로 전환되는 강력한 매도 신호입니다."
      );
    } else if (currDiff > 0) {
      // MACD가 시그널 위에 있는 상태
      if (histTrend >= 3) {
        bd.macd = 20;
        reasons.push(
          `✅ MACD 상승 모멘텀 강화 — ${histTrend}일 연속 히스토그램이 증가하고 있습니다. 매수 신호가 강해지고 있습니다.`
        );
      } else if (histTrend >= 1) {
        bd.macd = 12;
        reasons.push("📈 MACD 상승 모멘텀 — 매수 신호가 유지되고 있습니다.");
      } else {
        bd.macd = 5;
        reasons.push(
          "📊 MACD 양수 구간 — 상승 추세이나 모멘텀이 약해지고 있습니다."
        );
      }
    } else {
      // MACD가 시그널 아래
      if (histTrend <= -3) {
        bd.macd = -20;
        reasons.push(
          `🔴 MACD 하락 모멘텀 강화 — ${Math.abs(histTrend)}일 연속 히스토그램이 감소하고 있습니다. 매도 압력이 강해지고 있습니다.`
        );
      } else if (histTrend <= -1) {
        bd.macd = -12;
        reasons.push("📉 MACD 하락 모멘텀 — 매도 신호가 유지되고 있습니다.");
      } else {
        bd.macd = -5;
        reasons.push(
          "📊 MACD 음수 구간 — 하락 추세이나 낙폭이 줄어들고 있습니다."
        );
      }
    }
  }

  // ── 3. 이동평균 배열 (최대 ±25) ──────────────────────────────────────────
  const { ma5, ma20, ma60, close } = latest;
  if (ma5 != null && ma20 != null && ma60 != null) {
    // 완벽한 정배열: 주가 > MA5 > MA20 > MA60
    if (close > ma5 && ma5 > ma20 && ma20 > ma60) {
      bd.ma = 25;
      reasons.push(
        "✅ 이동평균 완벽 정배열 — 주가가 5일·20일·60일 평균 모두 위에 있습니다. 강한 상승 추세입니다."
      );
    } else if (close > ma20 && ma20 > ma60) {
      bd.ma = 18;
      reasons.push(
        "📈 이동평균 정배열 — 중장기 상승 추세가 유지되고 있습니다."
      );
    } else if (close > ma60) {
      bd.ma = 10;
      reasons.push(
        "📊 장기 이동평균(60일) 위 — 장기 상승 추세를 유지하고 있습니다."
      );
    } else if (close < ma5 && ma5 < ma20 && ma20 < ma60) {
      bd.ma = -25;
      reasons.push(
        "🔴 이동평균 완벽 역배열 — 주가가 5일·20일·60일 평균 모두 아래에 있습니다. 강한 하락 추세입니다."
      );
    } else if (close < ma20 && ma20 < ma60) {
      bd.ma = -18;
      reasons.push("📉 이동평균 역배열 — 중장기 하락 추세가 진행 중입니다.");
    } else if (close < ma60) {
      bd.ma = -10;
      reasons.push("⚠️ 장기 이동평균(60일) 아래 — 장기 하락 추세 구간입니다.");
    } else {
      bd.ma = 0;
      reasons.push(
        "📊 이동평균 혼재 — 추세 전환 구간입니다. 방향성을 확인하세요."
      );
    }
    // MA 골든/데드크로스 보너스
    if (prev.ma5 != null && prev.ma20 != null) {
      if (prev.ma5 <= prev.ma20 && ma5 > ma20) {
        bd.ma = Math.min(bd.ma + 10, 25);
        reasons.push(
          "✅ MA 골든크로스 — 단기 평균이 중기 평균을 상향 돌파했습니다. 추세 전환 신호입니다."
        );
      } else if (prev.ma5 >= prev.ma20 && ma5 < ma20) {
        bd.ma = Math.max(bd.ma - 10, -25);
        reasons.push(
          "🔴 MA 데드크로스 — 단기 평균이 중기 평균을 하향 돌파했습니다. 하락 전환 신호입니다."
        );
      }
    }
  } else if (ma5 != null && ma20 != null) {
    if (close > ma5 && close > ma20) {
      bd.ma = 15;
      reasons.push("📈 단기·중기 이동평균 위 — 상승 추세가 유지되고 있습니다.");
    } else if (close < ma5 && close < ma20) {
      bd.ma = -15;
      reasons.push("📉 단기·중기 이동평균 아래 — 하락 추세가 진행 중입니다.");
    }
  }

  // ── 4. 볼린저 밴드 (최대 ±15) ────────────────────────────────────────────
  if (
    latest.bbUpper != null &&
    latest.bbLower != null &&
    latest.bbMiddle != null
  ) {
    const { bbUpper, bbLower, bbMiddle } = latest;
    const bandWidth = bbUpper - bbLower;
    const position = bandWidth > 0 ? (close - bbLower) / bandWidth : 0.5; // 0=하단, 1=상단

    if (close <= bbLower) {
      bd.bollinger = 15;
      reasons.push(
        "✅ 볼린저 밴드 하단 터치 — 통계적으로 저평가된 가격 구간입니다. 반등 가능성이 높습니다."
      );
    } else if (position < 0.2) {
      bd.bollinger = 10;
      reasons.push(
        "📉 볼린저 밴드 하단 근접 — 가격이 밴드 하단에 가깝습니다. 반등 신호를 확인하세요."
      );
    } else if (close >= bbUpper) {
      bd.bollinger = -15;
      reasons.push(
        "⚠️ 볼린저 밴드 상단 돌파 — 통계적으로 고평가된 가격 구간입니다. 단기 조정 가능성이 있습니다."
      );
    } else if (position > 0.8) {
      bd.bollinger = -10;
      reasons.push(
        "📈 볼린저 밴드 상단 근접 — 가격이 밴드 상단에 가깝습니다. 추가 상승 여력을 확인하세요."
      );
    } else if (position >= 0.4 && position <= 0.6) {
      bd.bollinger = 0;
      reasons.push("📊 볼린저 밴드 중간 — 가격이 평균 수준에 위치해 있습니다.");
    } else if (position < 0.5) {
      bd.bollinger = 5;
    } else {
      bd.bollinger = -5;
    }
  }

  // ── 5. 거래량 (최대 ±10) ─────────────────────────────────────────────────
  const recentVols = prev3.map(c => c.volume).filter(v => v > 0);
  if (recentVols.length >= 3 && latest.volume > 0) {
    const avgVol =
      recentVols.slice(0, -1).reduce((a, b) => a + b, 0) /
      (recentVols.length - 1);
    const volRatio = latest.volume / avgVol;
    const priceUp = close > (prev.close ?? close);

    if (volRatio >= 2.0 && priceUp) {
      bd.volume = 10;
      reasons.push(
        `🔥 거래량 급증 (평균 대비 ${volRatio.toFixed(1)}배) — 강한 매수세가 유입되고 있습니다.`
      );
    } else if (volRatio >= 1.5 && priceUp) {
      bd.volume = 6;
      reasons.push(
        `📊 거래량 증가 (평균 대비 ${volRatio.toFixed(1)}배) — 매수세가 강화되고 있습니다.`
      );
    } else if (volRatio >= 2.0 && !priceUp) {
      bd.volume = -10;
      reasons.push(
        `⚠️ 거래량 급증 (평균 대비 ${volRatio.toFixed(1)}배) — 강한 매도세가 유입되고 있습니다.`
      );
    } else if (volRatio >= 1.5 && !priceUp) {
      bd.volume = -6;
      reasons.push(
        `📊 거래량 증가 (평균 대비 ${volRatio.toFixed(1)}배) — 매도세가 강화되고 있습니다.`
      );
    } else if (volRatio < 0.5) {
      bd.volume = priceUp ? -3 : 3; // 거래량 감소 시 추세 약화
      reasons.push(
        `📉 거래량 감소 (평균 대비 ${volRatio.toFixed(1)}배) — 현재 추세의 신뢰도가 낮습니다.`
      );
    }
  }

  // ── 6. 가격 모멘텀 (최대 ±10) ────────────────────────────────────────────
  if (prev3.length >= 4) {
    const closes = prev3.map(c => c.close);
    const momentum3d =
      closes.length >= 4
        ? ((closes[closes.length - 1] - closes[closes.length - 4]) /
            closes[closes.length - 4]) *
          100
        : 0;
    const momentum1d =
      ((close - (prev.close ?? close)) / (prev.close ?? close)) * 100;

    if (momentum3d >= 5) {
      bd.momentum = 10;
      reasons.push(
        `🚀 3일 모멘텀 +${momentum3d.toFixed(1)}% — 강한 상승 탄력이 이어지고 있습니다.`
      );
    } else if (momentum3d >= 2) {
      bd.momentum = 6;
      reasons.push(
        `📈 3일 모멘텀 +${momentum3d.toFixed(1)}% — 상승 탄력이 유지되고 있습니다.`
      );
    } else if (momentum3d <= -5) {
      bd.momentum = -10;
      reasons.push(
        `📉 3일 모멘텀 ${momentum3d.toFixed(1)}% — 강한 하락 압력이 이어지고 있습니다.`
      );
    } else if (momentum3d <= -2) {
      bd.momentum = -6;
      reasons.push(
        `⚠️ 3일 모멘텀 ${momentum3d.toFixed(1)}% — 하락 압력이 지속되고 있습니다.`
      );
    } else if (Math.abs(momentum1d) < 0.3) {
      bd.momentum = 0;
      reasons.push(
        "📊 가격 횡보 — 방향성이 불분명합니다. 추세 형성을 기다리세요."
      );
    }
  }

  // ── 최종 점수 계산 ────────────────────────────────────────────────────────
  const totalScore =
    bd.rsi + bd.macd + bd.ma + bd.volume + bd.momentum + bd.bollinger;
  const strength = Math.min(Math.abs(totalScore), 100);
  const { grade, gradeLabel, gradeColor, type } = gradeFromScore(totalScore);

  if (reasons.length === 0) {
    reasons.push(
      "📊 현재 뚜렷한 매매 신호가 없습니다. 추세 형성을 기다리는 것이 좋습니다."
    );
  }

  // 한 줄 요약 생성
  const positiveFactors = [];
  const negativeFactors = [];
  if (bd.rsi > 5) positiveFactors.push("RSI 저평가");
  else if (bd.rsi < -5) negativeFactors.push("RSI 고평가");
  if (bd.macd > 5) positiveFactors.push("MACD 상승");
  else if (bd.macd < -5) negativeFactors.push("MACD 하락");
  if (bd.ma > 5) positiveFactors.push("이평 정배열");
  else if (bd.ma < -5) negativeFactors.push("이평 역배열");
  if (bd.bollinger > 5) positiveFactors.push("밴드 하단");
  else if (bd.bollinger < -5) negativeFactors.push("밴드 상단");
  if (bd.volume > 3) positiveFactors.push("거래량 급증");
  else if (bd.volume < -3) negativeFactors.push("매도 거래량");
  if (bd.momentum > 3) positiveFactors.push("상승 모멘텀");
  else if (bd.momentum < -3) negativeFactors.push("하락 모멘텀");

  const summaryParts = [
    ...positiveFactors.slice(0, 2),
    ...negativeFactors.slice(0, 2).map(f => `${f} 주의`),
  ];
  const summary =
    summaryParts.length > 0 ? summaryParts.join(" · ") : "신호 중립";

  return {
    type,
    strength,
    grade,
    gradeLabel,
    gradeColor,
    reasons,
    breakdown: bd,
    summary,
  };
}

// ─── Stock Summary Builder ───────────────────────────────────────────────────

export async function getStockSummary(ticker: string): Promise<StockSummary> {
  const cacheKey = `summary:${ticker}`;
  const cached = cache.get<StockSummary>(cacheKey);
  if (cached) return cached;

  let quote: any;
  let candles: CandleData[];
  try {
    [quote, candles] = await Promise.all([
      getQuote(ticker),
      getHistoricalData(ticker, "6mo"),
    ]);
  } catch (err) {
    // 네트워크 오류 시 stale 캐시 반환 ("X분 전 데이터" 표시용)
    const stale = cache.getStale<StockSummary>(cacheKey);
    if (stale) {
      const minutesAgo = Math.round((Date.now() - stale.expiredAt) / 60000) + 3;
      return { ...stale.data, isStale: true, staleMinutesAgo: minutesAgo };
    }
    throw err;
  }

  // 오늘 실시간 가격으로 캔들 보완 (장중에는 오늘 데이터가 히스토리에 없음)
  const livePrice: number = (quote as any)?.regularMarketPrice ?? 0;
  const liveOpen: number = (quote as any)?.regularMarketOpen ?? livePrice;
  const liveHigh: number = (quote as any)?.regularMarketDayHigh ?? livePrice;
  const liveLow: number = (quote as any)?.regularMarketDayLow ?? livePrice;
  const liveVolume: number = (quote as any)?.regularMarketVolume ?? 0;
  const todayStr = new Date().toISOString().split("T")[0];
  const lastCandleDate =
    candles.length > 0
      ? new Date(candles[candles.length - 1].date).toISOString().split("T")[0]
      : "";

  // 마지막 캔들이 오늘이 아니고 실시간 가격이 있으면 오늘 캔들 추가
  if (livePrice > 0 && lastCandleDate !== todayStr) {
    const todayCandle: CandleData = {
      date: new Date().toISOString(),
      open: liveOpen,
      high: liveHigh,
      low: liveLow,
      close: livePrice,
      volume: liveVolume,
    };
    candles = [...candles, todayCandle];
    // 오늘 캔들 추가 후 기술적 지표 재계산
    candles = enrichWithIndicators(candles);
  } else if (livePrice > 0 && lastCandleDate === todayStr) {
    // 오늘 캔들이 이미 있으면 실시간 가격으로 업데이트
    const lastIdx = candles.length - 1;
    candles = [
      ...candles.slice(0, lastIdx),
      {
        ...candles[lastIdx],
        close: livePrice,
        high: Math.max(candles[lastIdx].high, livePrice),
        low: Math.min(candles[lastIdx].low, livePrice),
        volume: liveVolume,
      },
    ];
    candles = enrichWithIndicators(candles);
  }

  const latest = candles.length > 0 ? candles[candles.length - 1] : null;
  const signal = generateSignal(candles);
  const currencyInfo = getCurrencyInfo(ticker);
  const market = getMarketLabel(ticker);

  const summary: StockSummary = {
    ticker,
    name: (quote as any)?.shortName || (quote as any)?.longName || ticker,
    price: (quote as any)?.regularMarketPrice ?? 0,
    change: (quote as any)?.regularMarketChange ?? 0,
    changePercent: (quote as any)?.regularMarketChangePercent ?? 0,
    volume: (quote as any)?.regularMarketVolume ?? 0,
    marketCap: (quote as any)?.marketCap,
    signal,
    indicators: {
      rsi: latest?.rsi ?? null,
      macd: latest?.macd ?? null,
      macdSignalLine: latest?.macdSignal ?? null,
      macdHistogram: latest?.macdHistogram ?? null,
      ma5: latest?.ma5 ?? null,
      ma20: latest?.ma20 ?? null,
      ma60: latest?.ma60 ?? null,
      bbUpper: latest?.bbUpper ?? null,
      bbMiddle: latest?.bbMiddle ?? null,
      bbLower: latest?.bbLower ?? null,
    },
    lastUpdated: new Date().toISOString(),
    currency: currencyInfo.currency,
    currencySymbol: currencyInfo.symbol,
    market,
  };

  cache.set(cacheKey, summary, getSummaryTTL()); // 장중 20초, 장외 5분

  // 매수/매도 신호 생성 시 성과 추적 자동 기록 (강력매수/매수/매도/강력매도)
  if (signal.type !== "neutral" && summary.price > 0) {
    const perfCacheKey = `perf_recorded:${ticker}:${signal.type}:${new Date().toISOString().slice(0, 10)}`;
    if (!cache.get(perfCacheKey)) {
      // 하루에 같은 종목/신호 중복 기록 방지
      cache.set(perfCacheKey, true, 24 * 60 * 60 * 1000);
      import("./db")
        .then(({ recordSignalPerformance }) => {
          recordSignalPerformance({
            ticker,
            signalType: signal.type,
            strength: signal.strength,
            entryPrice: Number(summary.price.toFixed(4)),
            status: "pending",
          }).catch(() => {});
        })
        .catch(() => {});
    }
  }

  return summary;
}

/** 종목 검색 - 한국 주식 한글 검색 지원 */
export async function searchTicker(query: string) {
  const cacheKey = `search:${query}`;
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  // Korean query: search local DB first, then Yahoo
  if (isKoreanQuery(query)) {
    const localResults = searchKoreanLocal(query);
    if (localResults.length > 0) {
      cache.set(cacheKey, localResults, 30 * 60 * 1000);
      return localResults;
    }
    // If 6-digit code, try appending .KS
    if (/^\d{6}$/.test(query.trim())) {
      const ticker = `${query.trim()}.KS`;
      try {
        const result: any = await rateLimitedCall(() =>
          yahooFinance.search(query.trim())
        );
        const quotes = (result.quotes || [])
          .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
          .slice(0, 10)
          .map((q: any) => ({
            ticker: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            exchange: q.symbol?.endsWith(".KS")
              ? "KOSPI"
              : q.symbol?.endsWith(".KQ")
                ? "KOSDAQ"
                : q.exchange,
            type: q.quoteType,
          }));
        cache.set(cacheKey, quotes, 30 * 60 * 1000);
        return quotes;
      } catch (err) {
        console.error(`[Yahoo] Search failed for "${query}":`, err);
        return [];
      }
    }
    return localResults;
  }

  // Standard Yahoo Finance search
  try {
    const result: any = await rateLimitedCall(() => yahooFinance.search(query));
    const quotes = (result.quotes || [])
      .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .slice(0, 10)
      .map((q: any) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.symbol?.endsWith(".KS")
          ? "KOSPI"
          : q.symbol?.endsWith(".KQ")
            ? "KOSDAQ"
            : q.exchange,
        type: q.quoteType,
      }));
    cache.set(cacheKey, quotes, 30 * 60 * 1000); // 30분 캐시
    return quotes;
  } catch (err) {
    console.error(`[Yahoo] Search failed for "${query}":`, err);
    return [];
  }
}

// ─── Top Movers (실시간 상승/하락 주식) ──────────────────────────────────────

import type { TopMoversResult, TopMover } from "../shared/types";

/** 미국 주식 상위 100개 중 상승/하락 주식 스캔 */
export async function getYahooTopMovers(): Promise<TopMoversResult> {
  const cacheKey = "topMovers:us";
  const cached = cache.get<TopMoversResult>(cacheKey);
  if (cached) return cached;

  // 미국 주식 리스트 (scanner.ts에서 가져온 목록)
  const US_STOCKS = [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "GOOGL",
    "META",
    "TSLA",
    "AVGO",
    "ORCL",
    "AMD",
    "NFLX",
    "DIS",
    "INTC",
    "QCOM",
    "TXN",
    "MU",
    "AMAT",
    "LRCX",
    "KLAC",
    "MRVL",
    "CRM",
    "ADBE",
    "NOW",
    "SNOW",
    "PLTR",
    "DDOG",
    "ZS",
    "CRWD",
    "NET",
    "MDB",
  ];

  const movers: Array<TopMover & { changePercent: number }> = [];

  try {
    const quotes = await rateLimitedCall(() => yahooFinance.quote(US_STOCKS));
    const results = Array.isArray(quotes) ? quotes : [quotes];

    for (const quote of results) {
      if (
        quote &&
        quote.regularMarketPrice != null &&
        quote.regularMarketChange != null
      ) {
        movers.push({
          ticker: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent ?? 0,
          volume: quote.regularMarketVolume ?? 0,
          market: "US",
          rank: 0,
        });
      }
    }
  } catch (err) {
    console.error("[Yahoo] TopMovers batch fetch failed:", err);
  }

  // 상승 상위 10개 정렬
  const gainers = movers
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  // 하락 상위 10개 정렬
  const losers = movers
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  const result: TopMoversResult = {
    gainers,
    losers,
    timestamp: new Date().toISOString(),
  };

  // 캐시 대폭 강화 (5분)
  const ttl = 5 * 60 * 1000;
  cache.set(cacheKey, result, ttl);
  return result;
}

export async function getTopMovers(): Promise<TopMoversResult> {
  // 10초 타임아웃 적용
  return Promise.race([
    getYahooTopMovers(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Yahoo API Timeout")), 10000)
    ),
  ]).catch(err => {
    console.error("[TopMovers] Error:", err);
    return { gainers: [], losers: [], timestamp: new Date().toISOString() };
  });
}

/** 한국 주요 종목 상승/하락 순위 */
export async function getYahooKRTopMovers(): Promise<TopMoversResult> {
  const cacheKey = "topMovers:kr";
  const cached = cache.get<TopMoversResult>(cacheKey);
  if (cached) return cached;

  const movers: Array<TopMover & { changePercent: number }> = [];
  try {
    const krTickers = POPULAR_KR_STOCKS.map(s => s.ticker);
    
    // KIS가 설정되어 있고 장중이면 KIS 우선 시도
    const isOpen = isKRMarketOpen();
    
    if (isOpen && process.env.KIS_APP_KEY) {
      console.log("[DATA] Fetching KR Top Movers via KIS...");
      for (const ticker of krTickers) {
        const quote = await getKisKRQuote(ticker);
        if (quote) {
          const stock = POPULAR_KR_STOCKS.find(s => s.ticker === ticker);
          movers.push({
            ticker,
            name: stock?.nameKo || stock?.name || ticker,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            market: "KR",
            rank: 0,
          });
        }
        // 연속 호출 시 과부하 방지
        await new Promise(r => setTimeout(r, 20));
      }
    }

    // KIS 결과가 없거나 장외면 Yahoo Fallback
    if (movers.length === 0) {
      const quotes = await rateLimitedCall(() => yahooFinance.quote(krTickers));
      const results = Array.isArray(quotes) ? quotes : [quotes];

      for (const quote of results) {
        const stock = POPULAR_KR_STOCKS.find(s => s.ticker === quote.symbol);
        if (
          quote &&
          quote.regularMarketPrice != null &&
          quote.regularMarketChange != null
        ) {
          movers.push({
            ticker: quote.symbol,
            name: stock?.nameKo || stock?.name || quote.symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent ?? 0,
            volume: quote.regularMarketVolume ?? 0,
            market: "KR",
            rank: 0,
          });
        }
      }
    }
  } catch (err) {
    console.error("[Yahoo] KRTopMovers fetch failed:", err);
  }

  const gainers = [...movers]
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  const losers = [...movers]
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  const result: TopMoversResult = {
    gainers,
    losers,
    timestamp: new Date().toISOString(),
  };

  const ttl = isKRMarketOpen() ? 30 * 1000 : 5 * 60 * 1000;
  cache.set(cacheKey, result, ttl);
  return result;
}

export async function getKRTopMovers(): Promise<TopMoversResult> {
  // 10초 타임아웃 적용
  return Promise.race([
    getYahooKRTopMovers(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Yahoo API Timeout")), 10000)
    ),
  ]).catch(err => {
    console.error("[KRTopMovers] Error:", err);
    return { gainers: [], losers: [], timestamp: new Date().toISOString() };
  });
}
