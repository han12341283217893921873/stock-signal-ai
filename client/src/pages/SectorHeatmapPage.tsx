import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function SectorHeatmapPage() {
  const { data, isLoading } = trpc.insights.sectorHeatmap.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
    staleTime: 9 * 60 * 1000,
  });

  const getColor = (change: number) => {
    if (change >= 2) return "bg-green-600 text-white";
    if (change >= 1) return "bg-green-500/80 text-white";
    if (change >= 0.3) return "bg-green-500/50 text-green-100";
    if (change >= -0.3) return "bg-muted text-muted-foreground";
    if (change >= -1) return "bg-red-500/50 text-red-100";
    if (change >= -2) return "bg-red-500/80 text-white";
    return "bg-red-600 text-white";
  };

  const getSize = (change: number) => {
    const abs = Math.abs(change);
    if (abs >= 2) return "text-2xl font-black";
    if (abs >= 1) return "text-xl font-bold";
    return "text-base font-semibold";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="text-2xl">🗺️</span> S&P 500 섹터 히트맵
          </h1>
          <p className="text-muted-foreground mt-2">
            실시간 섹터별 등락률을 시각적으로 확인합니다. (Finviz 스타일)
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(11)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {data?.sectors?.map((sector: any) => (
                <div
                  key={sector.etf}
                  className={`rounded-2xl p-4 transition-all hover:scale-[1.02] cursor-default border border-white/10 ${getColor(sector.change)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {sector.etf}
                    </span>
                    <span
                      className={`text-[11px] font-bold flex items-center gap-0.5 ${sector.change >= 0 ? "" : ""}`}
                    >
                      {sector.change >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {sector.change >= 0 ? "+" : ""}
                      {sector.change.toFixed(2)}%
                    </span>
                  </div>
                  <p className={`${getSize(sector.change)} mb-3 leading-tight`}>
                    {sector.name}
                  </p>
                  <div className="space-y-0.5">
                    {sector.stockData?.map((s: any) => (
                      <div
                        key={s.ticker}
                        className="flex justify-between items-center opacity-80"
                      >
                        <span className="text-[10px] font-mono">
                          {s.ticker}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${s.change >= 0 ? "text-green-300" : "text-red-300"}`}
                        >
                          {s.change >= 0 ? "+" : ""}
                          {s.change.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6 justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  {[
                    ["bg-red-600", "-2%+"],
                    ["bg-red-500/80", "-1~2%"],
                    ["bg-muted", "0%"],
                    ["bg-green-500/50", "+0.3~1%"],
                    ["bg-green-500/80", "+1~2%"],
                    ["bg-green-600", "+2%+"],
                  ].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1">
                      <div className={`w-5 h-3 rounded ${c}`} />
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {data?.updatedAt && (
              <p className="text-[10px] text-muted-foreground/50 text-right">
                업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")}
              </p>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
