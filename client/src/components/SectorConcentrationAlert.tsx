import { useMemo } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";

// 티커 → 섹터 매핑 (주요 종목 커버)
const SECTOR_MAP: Record<string, string> = {
  // 반도체
  NVDA: "반도체",
  AMD: "반도체",
  INTC: "반도체",
  AVGO: "반도체",
  QCOM: "반도체",
  MU: "반도체",
  AMAT: "반도체",
  LRCX: "반도체",
  KLAC: "반도체",
  MRVL: "반도체",
  ON: "반도체",
  TXN: "반도체",
  NXPI: "반도체",
  MCHP: "반도체",
  MPWR: "반도체",
  "000660.KS": "반도체",
  "005930.KS": "반도체",
  "042700.KS": "반도체",
  // 빅테크
  AAPL: "빅테크",
  MSFT: "빅테크",
  GOOGL: "빅테크",
  GOOG: "빅테크",
  META: "빅테크",
  AMZN: "빅테크",
  TSLA: "빅테크",
  ORCL: "빅테크",
  // AI/소프트웨어
  PLTR: "AI/소프트웨어",
  CRWD: "AI/소프트웨어",
  PANW: "AI/소프트웨어",
  SNOW: "AI/소프트웨어",
  NET: "AI/소프트웨어",
  ZS: "AI/소프트웨어",
  ADBE: "AI/소프트웨어",
  CRM: "AI/소프트웨어",
  WDAY: "AI/소프트웨어",
  // 헬스케어
  LLY: "헬스케어",
  UNH: "헬스케어",
  JNJ: "헬스케어",
  ABBV: "헬스케어",
  MRK: "헬스케어",
  PFE: "헬스케어",
  AMGN: "헬스케어",
  GILD: "헬스케어",
  "207940.KS": "헬스케어",
  "068270.KS": "헬스케어",
  // 금융
  JPM: "금융",
  BAC: "금융",
  GS: "금융",
  MS: "금융",
  V: "금융",
  MA: "금융",
  AXP: "금융",
  BLK: "금융",
  SCHW: "금융",
  "055550.KS": "금융",
  "105560.KS": "금융",
  "086790.KS": "금융",
  // 에너지
  XOM: "에너지",
  CVX: "에너지",
  COP: "에너지",
  // 소비재
  WMT: "소비재",
  COST: "소비재",
  HD: "소비재",
  NKE: "소비재",
  MCD: "소비재",
  SBUX: "소비재",
  AMZN_R: "소비재",
  // 한국 대형주
  "005380.KS": "자동차",
  "000270.KS": "자동차",
  "035420.KS": "인터넷",
  "035720.KS": "인터넷",
  "373220.KS": "배터리",
  "006400.KS": "배터리",
  "051910.KS": "화학",
};

function getSector(ticker: string): string {
  return SECTOR_MAP[ticker.toUpperCase()] ?? SECTOR_MAP[ticker] ?? "기타";
}

interface Position {
  ticker: string;
  totalValue?: number;
  currentPrice?: number;
  quantity?: number;
}

interface SectorConcentrationAlertProps {
  positions: Position[];
  threshold?: number; // default 50%
}

const SECTOR_COLORS: Record<string, string> = {
  반도체: "text-cyan-400 bg-cyan-400/10 border-cyan-400/25",
  빅테크: "text-violet-400 bg-violet-400/10 border-violet-400/25",
  "AI/소프트웨어": "text-indigo-400 bg-indigo-400/10 border-indigo-400/25",
  헬스케어: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  금융: "text-amber-400 bg-amber-400/10 border-amber-400/25",
  에너지: "text-orange-400 bg-orange-400/10 border-orange-400/25",
  소비재: "text-pink-400 bg-pink-400/10 border-pink-400/25",
  자동차: "text-blue-400 bg-blue-400/10 border-blue-400/25",
  배터리: "text-lime-400 bg-lime-400/10 border-lime-400/25",
  인터넷: "text-purple-400 bg-purple-400/10 border-purple-400/25",
  화학: "text-teal-400 bg-teal-400/10 border-teal-400/25",
  기타: "text-muted-foreground bg-muted/30 border-border/50",
};

export default function SectorConcentrationAlert({
  positions,
  threshold = 50,
}: SectorConcentrationAlertProps) {
  const { sectorBreakdown, overweightSectors } = useMemo(() => {
    const totalValue = positions.reduce(
      (s, p) => s + (p.totalValue ?? (p.currentPrice ?? 0) * (p.quantity ?? 0)),
      0
    );
    if (totalValue === 0) return { sectorBreakdown: [], overweightSectors: [] };

    const sectorMap = new Map<string, number>();
    positions.forEach(p => {
      const sector = getSector(p.ticker);
      const val = p.totalValue ?? (p.currentPrice ?? 0) * (p.quantity ?? 0);
      sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + val);
    });

    const breakdown = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        pct: (value / totalValue) * 100,
      }))
      .sort((a, b) => b.pct - a.pct);

    const overweight = breakdown.filter(s => s.pct >= threshold);
    return { sectorBreakdown: breakdown, overweightSectors: overweight };
  }, [positions, threshold]);

  if (positions.length === 0) return null;

  const hasAlert = overweightSectors.length > 0;

  return (
    <div
      className={`rounded-xl border p-4 ${
        hasAlert
          ? "bg-yellow-500/5 border-yellow-500/25"
          : "bg-muted/20 border-border/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        {hasAlert ? (
          <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-bull shrink-0" />
        )}
        <div>
          <p
            className={`text-sm font-bold ${hasAlert ? "text-yellow-400" : "text-bull"}`}
          >
            {hasAlert ? "섹터 집중 경고" : "포트폴리오 분산 양호"}
          </p>
          {hasAlert && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {overweightSectors.map(s => s.sector).join(", ")} 섹터가{" "}
              {threshold}%를 초과했습니다
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {sectorBreakdown.map(s => {
          const isOver = s.pct >= threshold;
          const colorClass = SECTOR_COLORS[s.sector] ?? SECTOR_COLORS["기타"];
          return (
            <div key={s.sector}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colorClass}`}
                  >
                    {s.sector}
                  </span>
                  {isOver && (
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  )}
                </div>
                <span
                  className={`text-xs font-mono font-bold ${isOver ? "text-yellow-400" : "text-foreground"}`}
                >
                  {s.pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver
                      ? "bg-yellow-400"
                      : s.pct >= threshold * 0.7
                        ? "bg-neutral-signal"
                        : "bg-primary/60"
                  }`}
                  style={{ width: `${Math.min(s.pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {hasAlert && (
        <div className="mt-4 p-3 bg-yellow-500/8 rounded-lg border border-yellow-500/15">
          <p className="text-[11px] text-yellow-300/80 leading-relaxed">
            💡 <strong>리밸런싱 권장:</strong> 특정 섹터에 자산이 집중되면 해당
            업종 하락 시 전체 포트폴리오에 큰 영향을 미칩니다. 분산 투자로
            리스크를 줄이는 것을 권장합니다.
          </p>
        </div>
      )}
    </div>
  );
}
