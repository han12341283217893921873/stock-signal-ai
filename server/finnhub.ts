import axios from "axios";
import { ENV } from "./_core/env";
import type {
  CandleData,
  NewsHeadlineItem,
  TechnicalIndicators,
  TradeSignal,
  StockSummary,
  SignalGrade,
  SignalType,
  ScoreBreakdown,
  TopMoversResult,
  TopMover,
  FundamentalMetrics,
  FearGreedData,
} from "../shared/types";
import {
  getQuote as getYahooQuote,
  getHistoricalData as getYahooHistoricalData,
  getKRTopMovers as getYahooKRTopMovers,
  getTopMovers as getYahooTopMovers,
  searchTicker as getYahooQuoteSearch,
  getCompanyProfile as getYahooCompanyProfile,
  getHistoricalDataWithResolution,
} from "./yahoo";
export { getHistoricalDataWithResolution };
import { invokeLLM, parseJsonSafe } from "./_core/llm";

// Finnhub API 기본 설정
const FINNHUB_API_BASE = "https://finnhub.io/api/v1";
export const finnhubClient = axios.create({
  baseURL: FINNHUB_API_BASE,
  timeout: 10000,
});

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
  isHighPriority?: boolean;
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
  }

  set<T>(key: string, data: T, ttl?: number, isHighPriority = false): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.store.set(key, { data, expiresAt, isHighPriority });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      if (!entry.isHighPriority) {
        this.store.delete(key);
        return null;
      }
      return null; // Expired but kept for getStale
    }
    return entry.data;
  }

  getStale<T>(key: string): { data: T; expiredAt: number } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    return { data: entry.data, expiredAt: entry.expiresAt };
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new TTLCache(5 * 60 * 1000);

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

function isKRMarketOpen(): boolean {
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

/** USD/KRW 환율 조회 (기본값 1380) */
export async function getUsdKrwRate(): Promise<number> {
  const cacheKey = "usd_krw_rate";
  const cached = cache.get<number>(cacheKey);
  if (cached) return cached;

  try {
    const quote: any = await getQuote("KRW=X");
    const rate = quote?.regularMarketPrice || 1380;
    cache.set(cacheKey, rate, 60 * 60 * 1000); // 1시간 캐시
    return rate;
  } catch {
    return 1380;
  }
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
  return isAnyMarketOpen() ? 5 * 1000 : 5 * 60 * 1000; // 장중 5초, 장외 5분
}

function isFinnhubRateLimitError(err: unknown): boolean {
  return (
    axios.isAxiosError(err) &&
    [429, 502, 503, 504].includes(err.response?.status ?? 0)
  );
}

async function finnhubRequest<T>(
  path: string,
  params: Record<string, unknown>
) {
  const apiKey = ENV.finnhubApiKey;

  try {
    return await rateLimitedCall(() =>
      finnhubClient.get<T>(path, {
        params: { ...params, token: apiKey },
      })
    );
  } catch (err) {
    if (isFinnhubRateLimitError(err)) {
      console.warn(
        `[Finnhub] Rate limit hit for ${path}. Retrying after delay...`
      );
      await new Promise(resolve => setTimeout(resolve, 2000));
      return rateLimitedCall(() =>
        finnhubClient.get<T>(path, {
          params: { ...params, token: apiKey },
        })
      );
    }
    throw err;
  }
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
  await Promise.all(
    tickers.map(async ticker => {
      try {
        const cacheKey = `quote:${ticker}`;
        const cached = cache.get<any>(cacheKey);
        if (!cached) {
          // 캐시 만료 시에만 갱신 (rate limit 보호)
          const quote = await getQuote(ticker);
          cache.set(cacheKey, quote, getQuoteTTL());
        }
      } catch {
        /* 개별 실패는 무시 */
      }
    })
  );
}, 15 * 1000);

// Rate limiter: 최소 1000ms 간격으로 Finnhub 호출
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

// ─── Finnhub API Data Fetching ─────────────────────────────────────────────

export async function getQuote(ticker: string) {
  const cacheKey = `quote:${ticker}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  // Yahoo Finance로 직접 (미국/한국 모두)
  try {
    const yahooQuote = await getYahooQuote(ticker);
    cache.set(cacheKey, yahooQuote, getQuoteTTL());
    return yahooQuote;
  } catch (err) {
    console.error(`[Quote] Failed to fetch quote for ${ticker}:`, err);
    throw new Error(`Failed to fetch quote for ${ticker}`, { cause: err });
  }
}

export async function getHistoricalData(
  ticker: string,
  period: string = "6mo"
): Promise<CandleData[]> {
  const cacheKey = `history:${ticker}:${period}`;
  const cached = cache.get<CandleData[]>(cacheKey);
  if (cached) return cached;

  // Yahoo Finance로 직접 (미국/한국 모두)
  try {
    const yahooHistory = await getYahooHistoricalData(ticker, period);
    if (yahooHistory.length > 0) {
      cache.set(cacheKey, yahooHistory, 10 * 60 * 1000);
      return yahooHistory;
    }
  } catch (err) {
    console.error(`[History] Failed to fetch history for ${ticker}:`, err);
  }

  return [];
}

export async function getCompanyNews(
  ticker: string,
  days: number = 7
): Promise<NewsHeadlineItem[]> {
  const cacheKey = `companyNews:${ticker}`;
  const cached = cache.get<NewsHeadlineItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    const response = await finnhubRequest("/company-news", {
      symbol: ticker,
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    });

    const headlines = Array.isArray(response.data)
      ? response.data.slice(0, 10).map((item: any) => ({
          title: item.headline ?? item.summary ?? item.category ?? ticker,
          link: item.url,
          publishedAt: item.datetime
            ? new Date(item.datetime * 1000).toISOString()
            : undefined,
        }))
      : [];

    cache.set(cacheKey, headlines, 60 * 1000);
    return headlines;
  } catch (err) {
    console.warn(`[Finnhub] Failed to fetch company news for ${ticker}:`, err);
    return [];
  }
}

export async function getGeneralNews(
  category: string = "general"
): Promise<NewsHeadlineItem[]> {
  const cacheKey = `generalNews:${category}`;
  const cached = cache.get<NewsHeadlineItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await finnhubRequest("/news", {
      category,
    });

    const headlines = Array.isArray(response.data)
      ? response.data.slice(0, 10).map((item: any) => ({
          title:
            item.headline ?? item.summary ?? item.category ?? "Market News",
          link: item.url,
          publishedAt: item.datetime
            ? new Date(item.datetime * 1000).toISOString()
            : undefined,
        }))
      : [];

    cache.set(cacheKey, headlines, 60 * 1000);
    return headlines;
  } catch (err) {
    console.warn(
      `[Finnhub] Failed to fetch general news for category=${category}:`,
      err
    );
    return [];
  }
}

/** 기업 기본적 분석 지표 (PER, PBR, ROE 등) */
export async function getBasicFinancials(ticker: string): Promise<any> {
  const cacheKey = `fundamentals:${ticker}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await finnhubRequest<any>("/stock/metric", {
      symbol: ticker,
      metric: "all",
    });

    const metrics = response.data?.metric;
    if (!metrics) return null;

    const result = {
      peRatio:
        metrics.peNormalized ??
        metrics.peExclExtraTTM ??
        metrics.peBasicExclExtraTTM ??
        null,
      pbRatio: metrics.pbAnnual ?? metrics.pbQuarterly ?? null,
      roe: metrics.roeTTM ?? null,
      dividendYield:
        metrics.dividendYieldIndicatedAnnual ?? metrics.dividendYield5Y ?? null,
      marketCap: metrics.marketCapitalization ?? null,
      high52: metrics["52WeekHigh"] ?? null,
      low52: metrics["52WeekLow"] ?? null,
      eps: metrics.epsExclExtraItemsTTM ?? null,
      revenueGrowth: metrics.revenueGrowthTTM ?? null,
    };

    cache.set(cacheKey, result, 24 * 60 * 60 * 1000); // 24시간 캐시
    return result;
  } catch (err) {
    console.warn(
      `[Finnhub] Failed to fetch basic financials for ${ticker}:`,
      err
    );
    return null;
  }
}

/** 배당 정보 조회 (Feature 22) */
export async function getDividends(ticker: string): Promise<any[]> {
  const cacheKey = `dividends:${ticker}`;
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await finnhubRequest<any[]>("/stock/dividend", {
      symbol: ticker,
    });
    const dividends = Array.isArray(response.data) ? response.data : [];
    cache.set(cacheKey, dividends, 24 * 60 * 60 * 1000);
    return dividends;
  } catch (err) {
    console.warn(`[Finnhub] Failed to fetch dividends for ${ticker}:`, err);
    return [];
  }
}

/** 내부자 거래 정보 조회 (Feature 42) */
export async function getInsiderTransactions(ticker: string): Promise<any[]> {
  const cacheKey = `insider:${ticker}`;
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await finnhubRequest<any[]>(
      "/stock/insider-transactions",
      {
        symbol: ticker,
      }
    );
    const transactions = Array.isArray(response.data) ? response.data : [];
    cache.set(cacheKey, transactions, 12 * 60 * 60 * 1000); // 12시간 캐시
    return transactions;
  } catch (err) {
    console.warn(
      `[Finnhub] Failed to fetch insider transactions for ${ticker}:`,
      err
    );
    return [];
  }
}

/** 글로벌 주요 지수 정보 (Feature 46) */
export async function getGlobalIndices(): Promise<any[]> {
  const cacheKey = "global_indices";
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  const indices = [
    { ticker: "^GSPC", name: "S&P 500" },
    { ticker: "^IXIC", name: "Nasdaq" },
    { ticker: "^DJI", name: "Dow Jones" },
    { ticker: "^KS11", name: "KOSPI" },
    { ticker: "^KQ11", name: "KOSDAQ" },
    { ticker: "^N225", name: "Nikkei 225" },
    { ticker: "^HSI", name: "Hang Seng" },
    { ticker: "^GDAXI", name: "DAX (Germany)" },
    { ticker: "^FTSE", name: "FTSE 100 (UK)" },
  ];

  try {
    const results = await Promise.all(
      indices.map(async idx => {
        const q = await getQuote(idx.ticker);
        return {
          ...idx,
          price: (q as any)?.regularMarketPrice || 0,
          changePercent: (q as any)?.regularMarketChangePercent || 0,
        };
      })
    );
    cache.set(cacheKey, results, 5 * 60 * 1000); // 5분 캐시
    return results;
  } catch (err) {
    console.warn("[Finnhub] Global indices fetch failed:", err);
    return [];
  }
}

/** 경제 지표 캘린더 (FOMC, CPI 등) */
export async function getEconomicCalendar(): Promise<any[]> {
  const cacheKey = "economicCalendar";
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);
    to.setDate(to.getDate() + 14); // 2주 앞까지

    const response = await finnhubRequest<any[]>("/calendar/economic", {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    });

    let filtered = Array.isArray(response.data)
      ? response.data.filter(
          (item: any) =>
            [
              "United States",
              "Korea, Republic of",
              "South Korea",
              "USA",
              "KOR",
            ].includes(item.country) || ["USD", "KRW"].includes(item.unit)
        )
      : [];

    // 필터링된 결과가 없으면 전체에서 상위 10개라도 보여줌
    if (filtered.length === 0 && Array.isArray(response.data)) {
      filtered = response.data.slice(0, 10);
    }

    const events = filtered
      .map((item: any) => ({
        event: item.event,
        actual: item.actual,
        estimate: item.estimate,
        prev: item.prev,
        impact:
          item.importance > 2 ? "high" : item.importance > 1 ? "medium" : "low",
        time: item.time,
        unit: item.unit || item.country,
      }))
      .slice(0, 20);

    cache.set(cacheKey, events, 60 * 60 * 1000); // 1시간 캐시
    return events;
  } catch (err) {
    console.warn("[Finnhub] Failed to fetch economic calendar:", err);
    return [];
  }
}

/** 공포와 탐욕 지수 근사치 계산 */
export async function getFearGreedIndex(): Promise<any> {
  const cacheKey = "fearGreedIndex";
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    // VIX와 S&P 500 지표를 사용하여 근사치 계산
    const [vixQuote, spyHistory] = await Promise.all([
      getQuote("^VIX"),
      getHistoricalData("^GSPC", "1mo"),
    ]);

    const vix = (vixQuote as any)?.regularMarketPrice ?? 20;
    const latestSpy = spyHistory[spyHistory.length - 1];
    const spyRsi = latestSpy?.rsi ?? 50;

    // VIX 점수: 15 이하(욕심, 80점), 35 이상(공포, 20점)
    let vixScore = 50;
    if (vix <= 15) vixScore = 80;
    else if (vix >= 35) vixScore = 20;
    else vixScore = 80 - ((vix - 15) / 20) * 60;

    // RSI 점수: 70 이상(욕심, 90점), 30 이하(공포, 10점)
    const rsiScore = spyRsi;

    // 종합 점수 (가중치: VIX 0.6, RSI 0.4)
    const totalScore = Math.round(vixScore * 0.6 + rsiScore * 0.4);

    let label = "Neutral";
    if (totalScore <= 25) label = "Extreme Fear";
    else if (totalScore <= 45) label = "Fear";
    else if (totalScore <= 55) label = "Neutral";
    else if (totalScore <= 75) label = "Greed";
    else label = "Extreme Greed";

    const result = {
      score: totalScore,
      label,
      timestamp: new Date().toISOString(),
    };

    cache.set(cacheKey, result, 30 * 60 * 1000); // 30분 캐시
    return result;
  } catch (err) {
    console.warn(
      "[Finnhub] Failed to calculate Fear & Greed approximation:",
      err
    );
    return { score: 50, label: "Neutral", timestamp: new Date().toISOString() };
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

/**
 * 신호 생성 로직 전역 설정 객체 (SIGNAL_CONFIG)
 *
 * 이 객체를 통해 신호 생성에 사용되는 임계값과 가중치를 중앙에서 관리합니다.
 * 환경변수 또는 이 객체를 수정하여 파라미터를 조정하세요.
 *
 * 점수 체계:
 *   - 총점 범위: 약 -100 ~ +100
 *   - 각 지표별 기여 범위: RSI(±25), MACD(±25), MA(±25), Bollinger(±15), Volume(±10), Momentum(±10)
 *
 * 신호 등급 (gradeThresholds):
 *   - strongBuy (강력매수):  점수 ≥ 65  → 고신뢰 매수 신호
 *   - buy (매수):           점수 ≥ 40  → 일반 매수 신호
 *   - watch (관망):         점수 ≥ -40 → 방향성 불분명
 *   - sell (매도):          점수 ≥ -65 → 일반 매도 신호
 *   - strongSell (강력매도): 점수 < -65 → 고신뢰 매도 신호
 */
export const SIGNAL_CONFIG = {
  /** 신호 등급 판정 임계값 */
  gradeThresholds: {
    strongBuy: Number(process.env.SIGNAL_THRESHOLD_STRONG_BUY ?? 75), // 65 -> 75 (더욱 까다로운 강력매수)
    buy: Number(process.env.SIGNAL_THRESHOLD_BUY ?? 45), // 35 -> 45 (신호 발생 빈도 하향, 엄격한 매수)
    sell: Number(process.env.SIGNAL_THRESHOLD_SELL ?? -45), // -35 -> -45
    strongSell: Number(process.env.SIGNAL_THRESHOLD_STRONG_SELL ?? -75),
  },

  /** RSI 지표 임계값 (최대 ±25점 기여) */
  rsi: {
    extremeOversold: Number(process.env.SIGNAL_RSI_EXTREME_OVERSOLD ?? 25), // 극도 과매도 → +25점
    oversold: Number(process.env.SIGNAL_RSI_OVERSOLD ?? 35), // 과매도 → +18점
    neutralLow: Number(process.env.SIGNAL_RSI_NEUTRAL_LOW ?? 45), // 중립 하단 → +8~12점
    neutralHigh: Number(process.env.SIGNAL_RSI_NEUTRAL_HIGH ?? 55), // 중립 상단 → ±5점
    overbought: Number(process.env.SIGNAL_RSI_OVERBOUGHT ?? 65), // 과매수 → -8~12점
    extremeOverbought: Number(process.env.SIGNAL_RSI_EXTREME_OVERBOUGHT ?? 75), // 극도 과매수 → -25점
  },

  /** MACD 지표 가중치 (최대 ±25점 기여) */
  macd: {
    crossoverScore: Number(process.env.SIGNAL_MACD_CROSSOVER ?? 25), // 골든/데드크로스 점수
    strongMomentumScore: Number(process.env.SIGNAL_MACD_STRONG_MOMENTUM ?? 20), // 3일+ 연속 강세 점수
    momentumScore: Number(process.env.SIGNAL_MACD_MOMENTUM ?? 12), // 일반 모멘텀 점수
    weakMomentumScore: Number(process.env.SIGNAL_MACD_WEAK ?? 5), // 약한 모멘텀 점수
    consecutiveDays: Number(process.env.SIGNAL_MACD_CONSECUTIVE_DAYS ?? 3), // 연속 기준일 수
  },

  /** 이동평균 가중치 (최대 ±25점 기여) */
  ma: {
    perfectAlignmentScore: Number(process.env.SIGNAL_MA_PERFECT ?? 25), // 완벽 정배열 (주가>MA5>MA20>MA60)
    alignmentScore: Number(process.env.SIGNAL_MA_ALIGN ?? 18), // 정배열 (MA20>MA60)
    aboveLongTermScore: Number(process.env.SIGNAL_MA_LONG ?? 10), // 장기선 위
    crossoverBonus: Number(process.env.SIGNAL_MA_CROSSOVER_BONUS ?? 10), // 골든/데드크로스 보너스
  },

  /** 볼린저 밴드 가중치 (최대 ±15점 기여) */
  bollinger: {
    touchScore: Number(process.env.SIGNAL_BB_TOUCH ?? 15), // 밴드 터치
    nearScore: Number(process.env.SIGNAL_BB_NEAR ?? 10), // 밴드 근접
    nearThreshold: Number(process.env.SIGNAL_BB_NEAR_PCT ?? 0.2), // 근접 판정 기준 (밴드폭 대비)
  },

  /** 거래량 가중치 (최대 ±10점 기여) */
  volume: {
    surgeRatio: Number(process.env.SIGNAL_VOL_SURGE_RATIO ?? 2.0), // 급증 기준 (평균 대비 배율)
    increaseRatio: Number(process.env.SIGNAL_VOL_INCREASE_RATIO ?? 1.5), // 증가 기준
    decreaseRatio: Number(process.env.SIGNAL_VOL_DECREASE_RATIO ?? 0.5), // 감소 기준
    surgeScore: Number(process.env.SIGNAL_VOL_SURGE_SCORE ?? 10), // 급증 점수
    increaseScore: Number(process.env.SIGNAL_VOL_INCREASE_SCORE ?? 6), // 증가 점수
  },

  /** 가격 모멘텀 가중치 (최대 ±10점 기여) */
  momentum: {
    strongPct: Number(process.env.SIGNAL_MOM_STRONG_PCT ?? 5), // 강한 모멘텀 기준 (%)
    weakPct: Number(process.env.SIGNAL_MOM_WEAK_PCT ?? 2), // 약한 모멘텀 기준 (%)
    flatPct: Number(process.env.SIGNAL_MOM_FLAT_PCT ?? 0.3), // 횡보 판정 기준 (%)
    strongScore: Number(process.env.SIGNAL_MOM_STRONG_SCORE ?? 10), // 강한 모멘텀 점수
    weakScore: Number(process.env.SIGNAL_MOM_WEAK_SCORE ?? 6), // 약한 모멘텀 점수
  },

  /** AI 뉴스 감성 가중치 (최대 ±12점 기여) */
  sentiment: {
    positiveThreshold: 0.15, // 0.2 -> 0.15 (더 민감하게)
    negativeThreshold: -0.15, 
    maxScore: 15, // 12 -> 15 (AI 감성 비중 강화)
  },

  /** 섹터 및 시장 환경 가중치 (최대 ±8점 기여) */
  sector: {
    strongScore: 8, // 가중치 하향
    weakScore: 4,
  },

  /** 다중 타임프레임 (주봉) 가중치 (최대 ±10점 기여) */
  multiTimeframe: {
    bullishScore: 10, // 가중치 하향
    bearishScore: -10,
  },

  /** 시장 탐욕/공포 가중치 (최대 ±5점 기여) */
  marketGreed: {
    extremeScore: 5,
    normalScore: 3,
  },

  /** 펀더멘털 가중치 (최대 +7점 기여) */
  fundamental: {
    maxScore: 10, // 7 -> 10
    peThreshold: 20, // 15 -> 20 (더 넓은 저평가 기준)
    roeThreshold: 12, // 15 -> 12
  },

  /** 내부자 수급 가중치 (최대 +7점 기여) */
  insider: {
    maxScore: 7,
    normalScore: 3,
    countThreshold: 3,
  },
};

// ─── Signal Grade Helpers ────────────────────────────────────────────────────

/**
 * 총점을 신호 등급으로 변환합니다.
 * SIGNAL_CONFIG.gradeThresholds의 임계값을 사용하여 등급을 결정합니다.
 *
 * @param score - 각 지표 점수의 합계 (-100 ~ +100 범위)
 * @returns 신호 등급 객체 (grade, gradeLabel, gradeColor, type)
 */
function gradeFromScore(score: number): {
  grade: SignalGrade;
  gradeLabel: string;
  gradeColor: string;
  type: SignalType;
} {
  const { strongBuy, buy, sell, strongSell } = SIGNAL_CONFIG.gradeThresholds;
  if (score >= strongBuy)
    return {
      grade: "strong_buy",
      gradeLabel: "강력 매수",
      gradeColor: "text-emerald-400",
      type: "buy",
    };
  if (score >= buy)
    return {
      grade: "buy",
      gradeLabel: "매수",
      gradeColor: "text-green-400",
      type: "buy",
    };
  if (score >= 15)
    return {
      grade: "hold",
      gradeLabel: "보유",
      gradeColor: "text-blue-400",
      type: "hold" as SignalType, // Typecast if necessary, or we will update shared/types.ts
    };
  if (score >= sell)
    return {
      grade: "watch",
      gradeLabel: "관망",
      gradeColor: "text-yellow-400",
      type: "neutral",
    };
  if (score >= strongSell)
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

/**
 * 최근 N개 캔들에서 연속 증가/감소 카운트를 계산합니다.
 * 양수 반환: 연속 증가 횟수 (상승 모멘텀)
 * 음수 반환: 연속 감소 횟수 (하락 모멘텀)
 *
 * @param arr - 히스토그램 값 배열
 * @param n - 분석할 최근 N개
 */
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

/**
 * 캔들 데이터를 기반으로 매매 신호를 생성합니다.
 *
 * 6개 기술적 지표를 종합하여 총점을 계산하고 등급을 부여합니다:
 *   1. RSI (±25): 과매도/과매수 구간 판별
 *   2. MACD (±25): 추세 전환 및 모멘텀 강도
 *   3. 이동평균 배열 (±25): 단·중·장기 추세 방향
 *   4. 볼린저 밴드 (±15): 가격의 통계적 위치
 *   5. 거래량 (±10): 매수/매도 압력의 신뢰도
 *   6. 가격 모멘텀 (±10): 단기 가격 변화율
 *
 * 임계값과 가중치는 SIGNAL_CONFIG 객체에서 관리됩니다.
 * 환경변수(SIGNAL_THRESHOLD_*, SIGNAL_RSI_*, SIGNAL_MACD_* 등)로 재정의 가능합니다.
 *
 * @param candles - enrichWithIndicators()로 처리된 캔들 데이터 배열
 * @returns TradeSignal - 신호 타입, 강도, 등급, 이유, 지표별 점수 분해
 */
export function generateSignal(
  candles: CandleData[],
  fundamentals?: FundamentalMetrics | null,
  insiderTransactions?: any[] | null,
  extra?: {
    sentimentScore?: number;
    weeklyTrend?: "bullish" | "bearish" | "neutral";
    sectorPerformance?: number;
    marketGreedScore?: number;
    coolDownPenalty?: number;
    coolDownReason?: string | null;
  }
): TradeSignal {
  const emptyBreakdown: ScoreBreakdown = {
    rsi: 0,
    macd: 0,
    ma: 0,
    volume: 0,
    momentum: 0,
    bollinger: 0,
    fundamental: 0,
    sentiment: 0,
    sector: 0,
    multiTimeframe: 0,
    marketGreed: 0,
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
    fundamental: 0,
    sentiment: 0,
  };

  // ── 1. RSI (최대 ±25) ──────────────────────────────────────────────────────
  // 각 구간별 점수: 극도과매도(+25), 과매도(+18), 중립하단(+8~12), 중립(±5), 강세(-8~12), 과매수(-18), 극도과매수(-25)
  if (latest.rsi != null) {
    const rsi = latest.rsi;
    const prevRsi = prev.rsi ?? rsi;
    const rsiTrend = rsi - prevRsi; // 방향성 (양수=상승, 음수=하락)
    const RC = SIGNAL_CONFIG.rsi; // RSI 임계값 참조

    if (rsi <= RC.extremeOversold) {
      bd.rsi = 25;
      reasons.push(
        `📉 RSI ${rsi.toFixed(1)} — 극도로 저평가된 구간입니다. 반등 가능성이 높습니다.`
      );
    } else if (rsi <= RC.oversold) {
      bd.rsi = 18;
      reasons.push(
        `📉 RSI ${rsi.toFixed(1)} — 저평가 구간에 근접했습니다. 매수 기회를 탐색할 시점입니다.`
      );
    } else if (rsi <= RC.neutralLow) {
      bd.rsi = 8 + (rsiTrend > 0 ? 4 : 0);
      reasons.push(
        `📊 RSI ${rsi.toFixed(1)} — 중립 하단 구간입니다.${rsiTrend > 0 ? " 상승 반전 시도 중입니다." : ""}`
      );
    } else if (rsi <= RC.neutralHigh) {
      bd.rsi = rsiTrend > 0 ? 5 : -5;
      reasons.push(
        `📊 RSI ${rsi.toFixed(1)} — 균형 구간입니다.${rsiTrend > 0 ? " 상승 모멘텀이 형성되고 있습니다." : " 방향성을 확인 중입니다."}`
      );
    } else if (rsi <= RC.overbought) {
      bd.rsi = -8 + (rsiTrend < 0 ? -4 : 0);
      reasons.push(
        `📈 RSI ${rsi.toFixed(1)} — 강세 구간입니다.${rsiTrend < 0 ? " 상승 탄력이 둔화되고 있습니다." : ""}`
      );
    } else if (rsi <= RC.extremeOverbought) {
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
  // 골든/데드크로스(±25), 강한모멘텀(±20), 일반모멘텀(±12), 약한모멘텀(±5)
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
    const MC = SIGNAL_CONFIG.macd; // MACD 가중치 참조

    if (prevDiff <= 0 && currDiff > 0) {
      bd.macd = MC.crossoverScore; // 골든크로스: 가장 강한 매수 신호
      reasons.push(
        "✅ MACD 골든크로스 발생 — 하락에서 상승으로 전환되는 강력한 매수 신호입니다."
      );
    } else if (prevDiff >= 0 && currDiff < 0) {
      bd.macd = -MC.crossoverScore; // 데드크로스: 가장 강한 매도 신호
      reasons.push(
        "🔴 MACD 데드크로스 발생 — 상승에서 하락으로 전환되는 강력한 매도 신호입니다."
      );
    } else if (currDiff > 0) {
      // MACD가 시그널 위에 있는 상태: 연속 일수에 따라 점수 차등
      if (histTrend >= MC.consecutiveDays) {
        bd.macd = MC.strongMomentumScore;
        reasons.push(
          `✅ MACD 상승 모멘텀 강화 — ${histTrend}일 연속 히스토그램이 증가하고 있습니다. 매수 신호가 강해지고 있습니다.`
        );
      } else if (histTrend >= 1) {
        bd.macd = MC.momentumScore;
        reasons.push("📈 MACD 상승 모멘텀 — 매수 신호가 유지되고 있습니다.");
      } else {
        bd.macd = MC.weakMomentumScore;
        reasons.push(
          "📊 MACD 양수 구간 — 상승 추세이나 모멘텀이 약해지고 있습니다."
        );
      }
    } else {
      // MACD가 시그널 아래: 연속 일수에 따라 점수 차등
      if (histTrend <= -MC.consecutiveDays) {
        bd.macd = -MC.strongMomentumScore;
        reasons.push(
          `🔴 MACD 하락 모멘텀 강화 — ${Math.abs(histTrend)}일 연속 히스토그램이 감소하고 있습니다. 매도 압력이 강해지고 있습니다.`
        );
      } else if (histTrend <= -1) {
        bd.macd = -MC.momentumScore;
        reasons.push("📉 MACD 하락 모멘텀 — 매도 신호가 유지되고 있습니다.");
      } else {
        bd.macd = -MC.weakMomentumScore;
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

    const VC = SIGNAL_CONFIG.volume; // 거래량 임계값 참조
    // 급증+상승: 강한 매수세, 급증+하락: 강한 매도세, 증가+방향에 따라 차등
    if (volRatio >= VC.surgeRatio && priceUp) {
      bd.volume = VC.surgeScore;
      reasons.push(
        `🔥 거래량 급증 (평균 대비 ${volRatio.toFixed(1)}배) — 강한 매수세가 유입되고 있습니다.`
      );
    } else if (volRatio >= VC.increaseRatio && priceUp) {
      bd.volume = VC.increaseScore;
      reasons.push(
        `📊 거래량 증가 (평균 대비 ${volRatio.toFixed(1)}배) — 매수세가 강화되고 있습니다.`
      );
    } else if (volRatio >= VC.surgeRatio && !priceUp) {
      bd.volume = -VC.surgeScore;
      reasons.push(
        `⚠️ 거래량 급증 (평균 대비 ${volRatio.toFixed(1)}배) — 강한 매도세가 유입되고 있습니다.`
      );
    } else if (volRatio >= VC.increaseRatio && !priceUp) {
      bd.volume = -VC.increaseScore;
      reasons.push(
        `📊 거래량 증가 (평균 대비 ${volRatio.toFixed(1)}배) — 매도세가 강화되고 있습니다.`
      );
    } else if (volRatio < VC.decreaseRatio) {
      bd.volume = priceUp ? -3 : 3; // 거래량 감소 시 추세 신뢰도 약화
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

    const MOM = SIGNAL_CONFIG.momentum; // 모멘텀 임계값 참조
    // 3일 수익률 기반 상승/하락 모멘텀 점수 부여
    if (momentum3d >= MOM.strongPct) {
      bd.momentum = MOM.strongScore;
      reasons.push(
        `🚀 3일 모멘텀 +${momentum3d.toFixed(1)}% — 강한 상승 탄력이 이어지고 있습니다.`
      );
    } else if (momentum3d >= MOM.weakPct) {
      bd.momentum = MOM.weakScore;
      reasons.push(
        `📈 3일 모멘텀 +${momentum3d.toFixed(1)}% — 상승 탄력이 유지되고 있습니다.`
      );
    } else if (momentum3d <= -MOM.strongPct) {
      bd.momentum = -MOM.strongScore;
      reasons.push(
        `📉 3일 모멘텀 ${momentum3d.toFixed(1)}% — 강한 하락 압력이 이어지고 있습니다.`
      );
    } else if (momentum3d <= -MOM.weakPct) {
      bd.momentum = -MOM.weakScore;
      reasons.push(
        `⚠️ 3일 모멘텀 ${momentum3d.toFixed(1)}% — 하락 압력이 지속되고 있습니다.`
      );
    } else if (Math.abs(momentum1d) < MOM.flatPct) {
      bd.momentum = 0;
      reasons.push(
        "📊 가격 횡보 — 방향성이 불분명합니다. 추세 형성을 기다리세요."
      );
    }
  }

  // ── 7. 펀더멘털 보너스 (최대 +7) ───────────────────────────────────────────
  if (fundamentals) {
    let fBonus = 0;
    const FC = SIGNAL_CONFIG.fundamental;
    if (
      fundamentals.peRatio != null &&
      fundamentals.peRatio < FC.peThreshold &&
      fundamentals.peRatio > 0
    )
      fBonus += 3;
    if (fundamentals.roe != null && fundamentals.roe > FC.roeThreshold)
      fBonus += 4;
    if (fBonus > 0) {
      bd.fundamental = fBonus;
      reasons.push(
        `💎 우량한 펀더멘털 — ${fBonus >= FC.maxScore ? "수익성과 저평가 매력" : "기초 체력"}이 뛰어나 가산점이 부여되었습니다.`
      );
    }
  }

  // ── 8. 수급/인사이더 보너스 (최대 +7) ─────────────────────────────────────────
  if (insiderTransactions && insiderTransactions.length > 0) {
    const IC = SIGNAL_CONFIG.insider;
    const recentBuys = insiderTransactions.filter(
      t =>
        (typeof t.transactionType === "string" &&
          t.transactionType.toLowerCase().includes("buy")) ||
        (t.change != null && t.change > 0)
    ).length;

    if (recentBuys >= IC.countThreshold) {
      bd.sentiment = (bd.sentiment ?? 0) + IC.maxScore;
      reasons.push(
        "🚀 강력한 수급 시그널 — 내부자 또는 대형 자금의 집중 매집이 포착되었습니다."
      );
    } else if (recentBuys >= 1) {
      bd.sentiment = (bd.sentiment ?? 0) + IC.normalScore;
      reasons.push(
        "📈 긍정적인 수급 흐름 — 유의미한 매수 거래가 감지되었습니다."
      );
    }
  }

  // ── 9. AI 뉴스 감성 필터 (최대 ±10) ──────────────────────────────────────────
  if (extra?.sentimentScore != null) {
    const SC = SIGNAL_CONFIG.sentiment;
    // 뉴스 점수가 0.4 이상이거나 -0.4 이하일 때만 반영 (중립 뉴스 노이즈 제거)
    const normalizedSentiment = extra.sentimentScore / 20; // -1.0 ~ 1.0
    if (Math.abs(normalizedSentiment) >= SC.positiveThreshold) {
      const score = Math.round(normalizedSentiment * SC.maxScore);
      bd.sentiment = (bd.sentiment ?? 0) + score;
      if (score >= 6)
        reasons.push(
          `🤖 AI 뉴스 분석 — 매우 긍정적인 뉴스 흐름이 감지되었습니다.`
        );
      else if (score <= -6)
        reasons.push(
          `⚠️ AI 뉴스 분석 — 부정적인 이슈가 감지되었습니다. 주의가 필요합니다.`
        );
    }
  }

  // ── 10. 주봉 추세 필터 (최대 ±10) ──────────────────────────────────────────
  if (extra?.weeklyTrend) {
    const MTC = SIGNAL_CONFIG.multiTimeframe;
    if (extra.weeklyTrend === "bullish") {
      bd.multiTimeframe = MTC.bullishScore;
      reasons.push(
        "✅ 주봉 추세 컨펌 — 장기 추세가 상승세로 일봉 신호의 신뢰도가 높습니다."
      );
    } else if (extra.weeklyTrend === "bearish") {
      bd.multiTimeframe = MTC.bearishScore;
      reasons.push(
        "⚠️ 주봉 역배열 — 장기 추세가 하락세입니다. 일봉 반등이 일시적일 수 있습니다."
      );
    }
  }

  // ── 11. 섹터 주도성 필터 (최대 ±8) ──────────────────────────────────────────
  if (extra?.sectorPerformance != null) {
    const SEC = SIGNAL_CONFIG.sector;
    const sPerf = Math.round((extra.sectorPerformance / 15) * SEC.strongScore);
    bd.sector = sPerf;
    if (sPerf >= Math.round(SEC.strongScore / 2))
      reasons.push("🚀 섹터 강세 — 소속 섹터가 시장을 주도하고 있습니다.");
    else if (sPerf <= -Math.round(SEC.strongScore / 2))
      reasons.push(
        "📉 섹터 약세 — 해당 섹터 전반에 매도세가 강해 주의가 필요합니다."
      );
  }

  // ── 12. 시장 탐욕/공포 필터 (최대 ±5) ────────────────────────────────────────
  if (extra?.marketGreedScore != null) {
    const GC = SIGNAL_CONFIG.marketGreed;
    const gScore = Math.round((extra.marketGreedScore / 10) * GC.extremeScore);
    bd.marketGreed = gScore;
    if (gScore >= Math.round(GC.extremeScore * 0.6))
      reasons.push(
        "🔥 시장 과열 주의 — 전반적인 탐욕 지수가 높아 조정 가능성이 있습니다."
      );
    else if (gScore <= -Math.round(GC.extremeScore * 0.6))
      reasons.push(
        "💎 시장 공포 구간 — 투매 발생 구간으로 기술적 반등 확률이 높습니다."
      );
  }

  // ── 최종 점수 계산 ────────────────────────────────────────────────────────
  let totalScore =
    bd.rsi +
    bd.macd +
    bd.ma +
    bd.volume +
    bd.momentum +
    bd.bollinger +
    (bd.fundamental ?? 0) +
    (bd.sentiment ?? 0) +
    (bd.sector ?? 0) +
    (bd.multiTimeframe ?? 0) +
    (bd.marketGreed ?? 0);

  // ── 13. 실적 발표 쿨다운 필터 (Cool-down) ──────────────────────────────────
  if (extra?.coolDownPenalty != null && extra.coolDownPenalty < 0) {
    totalScore += extra.coolDownPenalty;
    reasons.push(
      extra.coolDownReason ?? "⚠️ 실적 발표 전후 변동성 주의 구간입니다."
    );
  }

  // ── 14. 신호 확정(Confirmation) 및 유지 로직 ──────────────────────────
  // 단기 노이즈로 인한 잦은 신호 변경(Flip-flopping) 방지
  let confirmationBonus = 0;
  if (prev3.length >= 3) {
    // 최근 3일 이내에 MACD 골든크로스 발생 또는 강한 모멘텀이 있었고, 20일선 위에 있는 경우
    const recentMacdCross = prev3.some((c, i) => i > 0 && (prev3[i-1].macd ?? 0) < (prev3[i-1].macdSignal ?? 0) && (c.macd ?? 0) > (c.macdSignal ?? 0));
    const isTrendIntact = (latest.close ?? 0) > (latest.ma20 ?? 0);
    
    // 매수 유지 확정: 점수가 다소 낮아지더라도 추세가 유효하면 점수 방어
    if ((recentMacdCross || bd.momentum > 5) && isTrendIntact && totalScore >= 15 && totalScore < SIGNAL_CONFIG.gradeThresholds.buy) {
       confirmationBonus = 15; // 보유/관망 점수를 매수 구간으로 방어
       reasons.push("🛡️ 신호 확정(Confirmation) — 최근 확인된 상승 추세가 유효하여 단기 노이즈를 필터링합니다.");
    }
  }
  totalScore += confirmationBonus;

  // 기술적 지표 합치도 확인 (Convergence Check)
  const techScores = [
    bd.rsi,
    bd.macd,
    bd.ma,
    bd.bollinger,
    bd.volume,
    bd.momentum,
  ];
  const positiveCount = techScores.filter(s => s >= 4).length; // 5 -> 4 (더 유연하게)
  const negativeCount = techScores.filter(s => s <= -4).length; // -5 -> -4

  // 점수가 높더라도 주요 기술적 지표들이 서로 엇갈리거나(Divergence)
  // 확실한 기술적 근거가 부족하면(Low Convergence) 점수를 보수적으로 조정
  if (totalScore >= SIGNAL_CONFIG.gradeThresholds.buy) {
    // 지표 합치도 강화: 최소 3개 이상의 기술적 지표가 매수 신호를 보내야 함
    if (positiveCount < 2) {
      totalScore *= 0.9; // 0.8 -> 0.9 (감액 완화)
      reasons.push(
        "📊 기술적 합치도 보완 필요 — 전체 점수는 양호하나 기술적 동조화가 다소 부족합니다."
      );
    } else if (negativeCount >= 3) { // 2 -> 3
      totalScore *= 0.8; // 0.75 -> 0.8
      reasons.push(
        "⚠️ 지표 엇갈림 — 강력한 매도 신호가 섞여 있어 변동성에 주의가 필요합니다."
      );
    }
  } else if (totalScore <= SIGNAL_CONFIG.gradeThresholds.sell) {
    if (negativeCount < 2) {
      totalScore *= 0.8;
      reasons.push(
        "⚠️ 기술적 근거 부족 — 하락 압력이 있으나 지표 간 합치도가 낮습니다."
      );
    } else if (positiveCount >= 3) {
      totalScore *= 0.85;
      reasons.push(
        "⚠️ 지표 엇갈림 — 일부 반등 신호가 섞여 있어 추격 매도에 주의가 필요합니다."
      );
    }
  }

  const strength = Math.min(Math.round(Math.abs(totalScore)), 100);
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

  // ── 9. 투자 전략 및 보유 기간 산출 ───────────────────────────────────────────
  let recommendedHold = "관망";
  let strategyLabel = "중립";

  if (totalScore >= 30) {
    const isFundamentalStrong = (bd.fundamental ?? 0) >= 5;
    const isTechnicalStrong = bd.rsi + bd.macd + bd.ma >= 40;

    if (isFundamentalStrong && isTechnicalStrong) {
      recommendedHold = "중장기 (수주 ~ 수개월)";
      strategyLabel = "추세 추종 + 가치 투자";
    } else if (isFundamentalStrong) {
      recommendedHold = "장기 (수개월 이상)";
      strategyLabel = "저평가 가치 매집";
    } else if (isTechnicalStrong) {
      recommendedHold = "단기 스윙 (3일 ~ 2주)";
      strategyLabel = "기술적 추세 매매";
    } else if (bd.volume >= 8) {
      recommendedHold = "초단기 (1 ~ 3일)";
      strategyLabel = "모멘텀 돌파";
    } else {
      recommendedHold = "단기 스윙 (1주 내외)";
      strategyLabel = "스윙 매매";
    }
  } else if (totalScore <= -30) {
    recommendedHold = "즉시 대응";
    strategyLabel = "리스크 관리 / 매도";
  }

  return {
    type,
    strength,
    grade,
    gradeLabel,
    gradeColor,
    reasons,
    breakdown: bd,
    summary,
    recommendedHold,
    strategyLabel,
  };
}

// ─── Stock Summary Builder ───────────────────────────────────────────────────

// ─── AI & Market Metric Helpers ──────────────────────────────────────────────
/** AI를 이용한 뉴스 헤드라인 감성 분석 (±20점 반환) */
async function analyzeSentimentWithAI(
  ticker: string,
  news: NewsHeadlineItem[]
): Promise<number> {
  const cacheKey = `sentiment:${ticker}:${new Date().toISOString().slice(0, 13)}`; // 1시간 캐시
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const headlines = news.map(n => n.title).join("\n");
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "당신은 극도로 보수적이고 객관적인 주식 시장 애널리스트입니다. 주어진 뉴스 헤드라인들이 해당 종목의 주가에 직접적이고 확실한 영향을 미칠 정도인지 냉철하게 분석하세요. 사소한 공시나 일반적인 소식은 0.0에 가깝게 평가하고, 매우 결정적인(실적 어닝 서프라이즈, 대규모 공급 계약 등) 소식에만 높은 가중치를 두어 -1.0(매우 부정)에서 +1.0(매우 긍정) 사이의 숫자로만 응답하세요. 판단이 모호하면 0.0을 반환하세요.",
        },
        {
          role: "user",
          content: `종목: ${ticker}\n뉴스 헤드라인:\n${headlines}`,
        },
      ],
      temperature: 0.1,
    });

    const score = parseFloat(result.choices[0].message.content.trim());
    if (isNaN(score)) return 0;

    // -20 ~ +20 점으로 스케일링
    const scaledScore = Math.round(score * 20);
    return scaledScore;
  } catch (err) {
    console.error(`[AI Sentiment] Error for ${ticker}:`, err);
    return 0;
  }
}

/** 실적 발표 직후 변동성 완화 필터 (Cool-down) */
export async function getRecentEarningsCoolDown(ticker: string): Promise<{ isCoolDown: boolean; penalty: number; reason: string | null }> {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const from = threeDaysAgo.toISOString().split("T")[0];
    const to = now.toISOString().split("T")[0];

    const res = await finnhubRequest<any>("/calendar/earnings", {
      from,
      to,
      symbol: ticker
    });

    const earnings = (res as any).data?.earningsCalendar || [];
    if (earnings.length > 0) {
      return { 
        isCoolDown: true, 
        penalty: -15, 
        reason: "📢 최근 실적 발표로 인한 변동성 구간 (Cool-down 적용)" 
      };
    }
    return { isCoolDown: false, penalty: 0, reason: null };
  } catch {
    return { isCoolDown: false, penalty: 0, reason: null };
  }
}
export function checkDelistingRisk(fundamentals: any, news: any[]): { isHighRisk: boolean, warnings: string[] } {
  const warnings: string[] = [];
  let riskScore = 0;

  if (fundamentals) {
    if (fundamentals.roe != null && fundamentals.roe < -30) {
      warnings.push("자본잠식 또는 심각한 적자 지속 (ROE < -30%)");
      riskScore += 2;
    }
    if (fundamentals.peRatio != null && fundamentals.peRatio < 0) {
      warnings.push("순이익 적자 상태");
      riskScore += 1;
    }
  }

  const badKeywords = ["delisting", "bankrupt", "fraud", "investigation", "lawsuit", "상장폐지", "감사거절", "횡령", "배임", "자본잠식", "관리종목"];
  if (news && news.length > 0) {
    const hasBadNews = news.some(n => {
      const text = n.headline.toLowerCase();
      return badKeywords.some(kw => text.includes(kw));
    });
    if (hasBadNews) {
      warnings.push("최근 뉴스에서 치명적 악재(상장폐지, 횡령, 배임 등) 감지");
      riskScore += 5;
    }
  }

  return {
    isHighRisk: riskScore >= 3,
    warnings
  };
}
export async function getStockSummary(ticker: string): Promise<StockSummary> {
  const cacheKey = `summary:${ticker}`;
  const cached = cache.get<StockSummary>(cacheKey);
  if (cached) return cached;

  try {
    // 1. 기초 데이터 페치
    const [quote, dailyCandles, profile, fundamentals, insider] =
      await Promise.all([
        getQuote(ticker),
        getHistoricalData(ticker, "6mo"),
        getYahooCompanyProfile(ticker).catch(() => null),
        getBasicFinancials(ticker).catch(() => null),
        getInsiderTransactions(ticker).catch(() => []),
      ]);

    // 2. 신규 개선 지표 페치 (뉴스, 주봉, 공포탐욕)
    const [news, weeklyCandles, fearGreed, coolDownData] = await Promise.all([
      getCompanyNews(ticker, 3).catch(() => []),
      getHistoricalDataWithResolution(ticker, "1wk", "2y").catch(() => []),
      getFearGreedIndex().catch(() => ({
        score: 50,
        label: "Neutral",
        timestamp: "",
      })),
      getRecentEarningsCoolDown(ticker).catch(() => ({ isCoolDown: false, penalty: 0, reason: null })),
    ]);

    // 3. AI 뉴스 감성 분석
    let sentimentScore = 0;
    if (news.length > 0) {
      sentimentScore = await analyzeSentimentWithAI(ticker, news);
    }

    // 4. 주봉 추세 판단
    let weeklyTrend: "bullish" | "bearish" | "neutral" = "neutral";
    if (weeklyCandles.length > 5) {
      const last = weeklyCandles[weeklyCandles.length - 1];
      if (last.ma5 && last.ma20 && last.ma5 > last.ma20)
        weeklyTrend = "bullish";
      else if (last.ma5 && last.ma20 && last.ma5 < last.ma20)
        weeklyTrend = "bearish";
    }

    // 5. 시장 공포/탐욕 점수 (-10 ~ +10 변환)
    const marketGreedScore = (fearGreed.score - 50) / 5;

    const signalExtra = {
      sentimentScore,
      weeklyTrend,
      sectorPerformance: 0, // 향후 확장
      marketGreedScore,
      coolDownPenalty: coolDownData.isCoolDown ? coolDownData.penalty : 0,
      coolDownReason: coolDownData.reason,
    };

    let candles = dailyCandles;
    // 6. 오늘 실시간 가격으로 캔들 보완
    const livePrice: number = quote?.regularMarketPrice ?? 0;
    const liveOpen: number = quote?.regularMarketOpen ?? livePrice;
    const liveHigh: number = quote?.regularMarketDayHigh ?? livePrice;
    const liveLow: number = quote?.regularMarketDayLow ?? livePrice;
    const liveVolume: number = quote?.regularMarketVolume ?? 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const lastCandleDate =
      candles.length > 0
        ? new Date(candles[candles.length - 1].date).toISOString().split("T")[0]
        : "";

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
      candles = enrichWithIndicators(candles);
    } else if (livePrice > 0 && lastCandleDate === todayStr) {
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
    const signal = generateSignal(candles, fundamentals, insider, signalExtra);
    
    // Delisting Risk Check
    const delistingCheck = checkDelistingRisk(fundamentals, news);
    if (delistingCheck.isHighRisk) {
      signal.type = "sell";
      signal.grade = "strong_sell";
      signal.gradeLabel = "강력 매도 (상폐/폭락 위험)";
      signal.strength = 100;
      signal.reasons.unshift(`🚨지뢰경보: ${delistingCheck.warnings.join(", ")}`);
    }

    const currencyInfo = getCurrencyInfo(ticker);
    const market = getMarketLabel(ticker);

    const summary: StockSummary = {
      ticker,
      name: quote?.shortName || quote?.longName || ticker,
      price: quote?.regularMarketPrice ?? 0,
      change: quote?.regularMarketChange ?? 0,
      changePercent: quote?.regularMarketChangePercent ?? 0,
      volume: quote?.regularMarketVolume ?? 0,
      marketCap: quote?.marketCap,
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
      sector: profile?.sector ?? "Etc",
      industry: profile?.industry ?? "Etc",
      delistingRisk: delistingCheck,
    } as any; // Allow the extra field without strict TS complaint

    cache.set(cacheKey, summary, getSummaryTTL());

    // 매수/매도 신호 성과 추적 기록
    if (signal.type !== "neutral" && summary.price > 0) {
      const perfCacheKey = `perf_recorded:${ticker}:${signal.type}:${new Date().toISOString().slice(0, 10)}`;
      if (!cache.get(perfCacheKey)) {
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
  } catch (err) {
    const stale = cache.getStale<StockSummary>(cacheKey);
    if (stale) {
      const minutesAgo = Math.round((Date.now() - stale.expiredAt) / 60000) + 3;
      return { ...stale.data, isStale: true, staleMinutesAgo: minutesAgo };
    }
    throw err;
  }
}

/** 종목 검색 - 한국 주식 한글 검색 지원, 미국 주식은 Yahoo Finance 사용 */
export async function searchTicker(query: string) {
  const cacheKey = `search:${query}`;
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  // Korean query: search local DB first
  if (isKoreanQuery(query)) {
    const localResults = searchKoreanLocal(query);
    if (localResults.length > 0) {
      cache.set(cacheKey, localResults, 30 * 60 * 1000);
      return localResults;
    }
    // If not found in local DB, return empty (avoid API calls for Korean)
    return [];
  }

  // US stock: use Yahoo Finance primarily
  try {
    console.log(`[Search] Searching for "${query}" using Yahoo Finance`);
    const yahooResults = await getYahooQuoteSearch(query);
    if (yahooResults && yahooResults.length > 0) {
      cache.set(cacheKey, yahooResults, 30 * 60 * 1000);
      console.log(
        `[Search] Found ${yahooResults.length} results from Yahoo Finance`
      );
      return yahooResults;
    }
  } catch (err) {
    console.warn(`[Search] Yahoo Finance search failed for "${query}":`, err);
  }

  // Fallback to Finnhub for US stocks
  try {
    console.log(`[Search] Fallback: Searching for "${query}" using Finnhub`);
    const response = await rateLimitedCall(() =>
      finnhubClient.get("/search", {
        params: { q: query, token: ENV.finnhubApiKey },
      })
    );

    if (!response.data.result || response.data.result.length === 0) {
      console.warn(`[Search] No results from Finnhub for "${query}"`);
      return [];
    }

    const quotes = (response.data.result || [])
      .filter(
        (q: any) =>
          q.type === "equity" || q.type === "etf" || q.type === "Common Stock"
      )
      .slice(0, 10)
      .map((q: any) => ({
        ticker: q.symbol,
        name: q.description || q.displaySymbol || q.symbol,
        exchange: q.mic || "UNKNOWN",
        type: q.type,
      }));

    cache.set(cacheKey, quotes, 30 * 60 * 1000);
    console.log(`[Search] Found ${quotes.length} results from Finnhub`);
    return quotes;
  } catch (err) {
    console.error(
      `[Search] Both Yahoo and Finnhub failed for "${query}":`,
      err
    );
    return [];
  }
}

// ─── Top Movers (미국/한국 주식) ──────────────────────────────────────────────

/** 미국 주식 상위 100개 중 상승/하락 주식 스캔 */
export async function getTopMovers(): Promise<TopMoversResult> {
  try {
    return await Promise.race([
      getYahooTopMovers(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Yahoo API Timeout")), 30000)
      ),
    ]);
  } catch (err) {
    console.error("[TopMovers] Error:", err);
    return { gainers: [], losers: [], timestamp: new Date().toISOString() };
  }
}

/** 한국 주식 상위 30개 중 상승/하락 주식 스캔 */
export async function getKRTopMovers(): Promise<TopMoversResult> {
  try {
    return await Promise.race([
      getYahooKRTopMovers(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Yahoo API Timeout")), 30000)
      ),
    ]);
  } catch (err) {
    console.error("[KRTopMovers] Error:", err);
    return { gainers: [], losers: [], timestamp: new Date().toISOString() };
  }
}
