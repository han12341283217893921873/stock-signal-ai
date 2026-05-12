import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, TrendingUp, TrendingDown, Map as MapIcon } from "lucide-react";

export default function GlobalMarketMap() {
  const { data: indices, isLoading } = trpc.macro.globalIndices.useQuery();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!indices) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          글로벌 마켓 맵 (World Indices)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {indices.map((idx: any, i: number) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase truncate">
                  {idx.name}
                </span>
                {idx.changePercent >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-bull opacity-50" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-bear opacity-50" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black font-mono">
                  {idx.price.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`text-[10px] font-bold ${idx.changePercent >= 0 ? "text-bull" : "text-bear"}`}
                >
                  {idx.changePercent >= 0 ? "+" : ""}
                  {idx.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${idx.changePercent >= 0 ? "bg-bull" : "bg-bear"}`}
                  style={{
                    width: `${Math.min(Math.abs(idx.changePercent) * 20, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
          <MapIcon className="h-3 w-3 text-muted-foreground" />
          <p className="text-[9px] text-muted-foreground italic leading-tight">
            전 세계 주요 지수의 실시간 흐름을 통해 글로벌 자금의 이동 방향을
            파악할 수 있습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
