import { getHistoricalData, cache } from "../finnhub";

export interface SectorStatus {
  name: string;
  ticker: string;
  change: number;
  momentum: number; // -10 ~ +10
  isMeltdown: boolean;
}

const SECTORS = [
  { ticker: "XLK", name: "Tech" },
  { ticker: "XLF", name: "Financials" },
  { ticker: "XLV", name: "Healthcare" },
  { ticker: "XLE", name: "Energy" },
  { ticker: "XLI", name: "Industrials" },
  { ticker: "XLP", name: "Consumer Staples" },
  { ticker: "XLY", name: "Consumer Discretionary" },
  { ticker: "XLB", name: "Materials" },
  { ticker: "XLU", name: "Utilities" },
  { ticker: "XLRE", name: "Real Estate" },
  { ticker: "XLC", name: "Communication" },
];

/**
 * 섹터 레이더 (Sector Radar)
 * 특정 산업군 전체의 흐름을 감지하여 개별 종목의 리스크를 진단합니다.
 */
export async function getSectorRadar(): Promise<SectorStatus[]> {
  const cacheKey = "sector_radar_data";
  const cached = cache.get<SectorStatus[]>(cacheKey);
  if (cached) return cached;

  const results = await Promise.allSettled(
    SECTORS.map(async (s) => {
      const candles = await getHistoricalData(s.ticker, "1mo");
      if (!candles || candles.length < 5) return null;

      const latest = candles[candles.length - 1].close;
      const prev = candles[candles.length - 2].close;
      const change = ((latest - prev) / prev) * 100;

      // 최근 5일 추세
      const recent = candles.slice(-5).map(c => c.close);
      const isDeclining = recent.every((val, i) => i === 0 || val <= recent[i-1]);

      return {
        ...s,
        change: Number(change.toFixed(2)),
        momentum: isDeclining ? -5 : change > 0 ? 3 : 0,
        isMeltdown: change < -3.0 || (change < -1.5 && isDeclining)
      };
    })
  );

  const data = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  cache.set(cacheKey, data, 10 * 60 * 1000); // 10분 캐시
  return data;
}

/** 종목 티커를 넣으면 해당 섹터의 위험도를 반환 */
export function getSectorRiskForTicker(ticker: string, sectorData: SectorStatus[]): { penalty: number; alert: string | null } {
  // 간단한 섹터 매핑 (실제로는 더 정교한 매핑 필요)
  // 예: NVDA -> XLK, JPM -> XLF
  // 여기서는 하드코딩된 로직이나 프로필 데이터를 사용해야 함
  return { penalty: 0, alert: null }; 
}
