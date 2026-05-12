import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves, TrendingUp, TrendingDown, Anchor } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WhaleFlowWidgetProps {
  ticker: string;
}

export default function WhaleFlowWidget({ ticker }: WhaleFlowWidgetProps) {
  const { data: whale, isLoading } = trpc.stock.whaleFlow.useQuery({ ticker });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!whale || whale.activities.length === 0) return null;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-blue-500/5">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-400">
          <Waves className="h-4 w-4" />
          고래 거래 추적 (Whale Flow)
        </CardTitle>
        <Badge
          className={`${
            whale.sentiment === "Bullish"
              ? "bg-bull/20 text-bull"
              : "bg-bear/20 text-bear"
          } border-none`}
        >
          {whale.sentiment}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          평균 거래량의 2배가 넘는 대량 거래를 추적하여 기관 및 세력의 매집/분산
          여부를 분석합니다.
        </p>
        <div className="space-y-3">
          {whale.activities.map((a: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${a.type.includes("매집") ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}
                >
                  <Anchor className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold">{a.type}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(a.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold">
                  x{a.volumeMultiplier} Vol
                </p>
                <p
                  className={`text-[10px] font-bold ${Number(a.priceChange) >= 0 ? "text-bull" : "text-bear"}`}
                >
                  {a.priceChange}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
