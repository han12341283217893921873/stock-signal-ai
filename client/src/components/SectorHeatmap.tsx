import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, TrendingDown } from "lucide-react";

export default function SectorHeatmap() {
  const { data: sectors, isLoading } = trpc.macro.sectorHeatmap.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!sectors) return null;

  const getHeatColor = (value: number) => {
    if (value > 2) return "bg-bull/20 border-bull/30 text-bull";
    if (value > 0.5) return "bg-bull/10 border-bull/20 text-bull/80";
    if (value < -2) return "bg-bear/20 border-bear/30 text-bear";
    if (value < -0.5) return "bg-bear/10 border-bear/20 text-bear/80";
    return "bg-muted/50 border-border text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          글로벌 섹터 히트맵 (24h)
        </h3>
        <p className="text-[10px] text-muted-foreground">
          실시간 상위 종목 가중 평균
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {(sectors as any)?.map &&
          (sectors as any).map((sector: any) => (
            <Card
              key={sector.name}
              className={`glass-card border ${getHeatColor(sector.value)} transition-all hover:scale-[1.02]`}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold truncate pr-2">
                    {sector.name}
                  </span>
                  <span className="text-[12px] font-black font-mono">
                    {sector.value > 0 ? "+" : ""}
                    {sector.value.toFixed(2)}%
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {sector.topStocks.map((s: any) => (
                    <Badge
                      key={s.ticker}
                      variant="outline"
                      className="text-[8px] py-0 px-1 border-current/20 bg-current/5"
                    >
                      {s.ticker}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
