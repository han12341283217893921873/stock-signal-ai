import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  BrainCircuit,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

const SIGNAL_LABELS: Record<string, string> = {
  buy: "매수",
  strong_buy: "강력매수",
  sell: "매도",
  neutral: "중립",
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80
      ? "bg-bull"
      : pct >= 60
        ? "bg-neutral-signal"
        : "bg-muted-foreground/40";
  return (
    <div className="w-full h-1 bg-muted/40 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function DailyTopPicksWidget() {
  const [, setLocation] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 스캐너 결과에서 상위 5개 매수 신호를 가져옴
  const { data: scanUs, refetch: refetchUs } = trpc.scanner.status.useQuery(
    { market: "us" },
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: scanKr, refetch: refetchKr } = trpc.scanner.status.useQuery(
    { market: "kr" },
    { staleTime: 5 * 60 * 1000 }
  );

  const topPicks = (() => {
    const usResults = (scanUs?.results ?? []).filter(
      r => r.signalType === "buy" || r.signalType === "neutral"
    );
    const krResults = (scanKr?.results ?? []).filter(
      r => r.signalType === "buy" || r.signalType === "neutral"
    );
    const combined = [...usResults, ...krResults];
    return combined
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 5);
  })();

  const hasResults = topPicks.length > 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchUs(), refetchKr()]);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
            <BrainCircuit className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              오늘의 AI 추천 TOP 5
            </p>
            <p className="text-[10px] text-muted-foreground">
              스캐너 결과 기준 · 매수/중립 상위 종목
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-7 w-7 p-0 rounded-lg"
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {!hasResults ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center rounded-xl border border-dashed border-border/40 bg-muted/10">
          <Zap className="w-8 h-8 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              아직 스캔 결과가 없습니다
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              종목 스캐너를 실행하면 AI 추천 TOP 5가 여기에 표시됩니다
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/scanner")}
            className="gap-1.5 h-7 text-xs mt-1"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            스캐너 실행하기
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {topPicks.map((pick, idx) => {
            const isKR =
              pick.ticker.endsWith(".KS") || pick.ticker.endsWith(".KQ");
            const changeIsPos = (pick.changePercent ?? 0) >= 0;
            return (
              <div
                key={pick.ticker}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 hover:border-primary/20 transition-all cursor-pointer group premium-border"
                onClick={() => setLocation(`/stock/${pick.ticker}`)}
              >
                {/* 순위 배지 */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    idx === 0
                      ? "bg-gradient-primary text-white shadow-lg shadow-primary/30"
                      : idx === 1
                        ? "bg-muted/60 text-foreground"
                        : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {idx + 1}
                </div>

                {/* 종목 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono font-black text-sm">
                      {pick.ticker.replace(".KS", "").replace(".KQ", "")}
                    </span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary/80 font-semibold">
                      {isKR ? "KR" : "US"}
                    </span>
                    {pick.signalType === "buy" ? (
                      <Badge className="badge-buy text-[9px] h-4 px-1.5 shrink-0">
                        매수
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0 border-yellow-500/50 text-yellow-500 bg-yellow-500/5">
                        중립
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
                    {pick.name}
                  </p>
                  <ScoreBar score={pick.signalStrength} />
                </div>

                {/* 점수 & 가격 */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end mb-0.5">
                    <BrainCircuit className="w-3 h-3 text-primary/60" />
                    <span className="text-xs font-black text-primary">
                      {pick.signalStrength}pt
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-bold ${changeIsPos ? "text-bull" : "text-bear"}`}
                  >
                    {changeIsPos ? "▲" : "▼"}
                    {Math.abs(pick.changePercent ?? 0).toFixed(2)}%
                  </span>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {hasResults && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/scanner")}
          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          전체 스캐너 결과 보기
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
