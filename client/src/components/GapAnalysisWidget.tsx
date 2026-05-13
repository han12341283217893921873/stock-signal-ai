import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MoveUp, MoveDown, Info, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GapAnalysisWidgetProps {
  ticker: string;
}

export default function GapAnalysisWidget({ ticker }: GapAnalysisWidgetProps) {
  const { data: gap, isLoading } = trpc.stock.gapAnalysis.useQuery({ ticker });

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!gap) return null;

  const isGapUp = gap.gapPercent > 0;
  const isLargeGap = Math.abs(gap.gapPercent) > 2;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          오프닝 갭 분석
        </CardTitle>
        <Badge
          variant="outline"
          className={`${
            isGapUp
              ? "text-bull border-bull/20 bg-bull/5"
              : "text-bear border-bear/20 bg-bear/5"
          }`}
        >
          {gap.type}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              시가 갭 (오늘 기준)
            </p>
            <div className="flex items-center gap-1">
              {isGapUp ? (
                <MoveUp className="h-4 w-4 text-bull" />
              ) : (
                <MoveDown className="h-4 w-4 text-bear" />
              )}
              <span
                className={`text-2xl font-black font-mono ${isGapUp ? "text-bull" : "text-bear"}`}
              >
                {Math.abs(gap.gapPercent)}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              갭 매워질 확률
            </p>
            <p className="text-sm font-bold text-amber-400">
              {gap.fillProbability}%
            </p>
          </div>
        </div>

        <div
          className={`p-2 rounded-md border text-[11px] leading-snug flex gap-2 items-start ${
            isLargeGap
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-muted/30 border-border/50"
          }`}
        >
          <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground">AI 전략 가이드</p>
            <p className="text-muted-foreground">{gap.strategy}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
