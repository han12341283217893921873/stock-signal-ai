import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CorrelationMatrix() {
  const { data, isLoading } = trpc.portfolio.correlation.useQuery();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">상관관계 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.matrix.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">상관관계 분석</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground text-xs text-center p-6">
          분석을 위해 포트폴리오에 최소 2개 이상의 종목이 필요합니다.
        </CardContent>
      </Card>
    );
  }

  const { tickers, matrix } = data;

  const getBgColor = (val: number) => {
    if (val > 0.7) return "bg-red-500/80 text-white";
    if (val > 0.3) return "bg-orange-400/60 text-white";
    if (val > -0.3) return "bg-neutral-500/20 text-muted-foreground";
    if (val > -0.7) return "bg-blue-400/60 text-white";
    return "bg-blue-600/80 text-white";
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          포트폴리오 상관관계 매트릭스
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-xs">
                -1에 가까울수록 반대로 움직이고, 1에 가까울수록 똑같이
                움직입니다. 분산 투자를 위해 낮은 상관관계가 유리합니다.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto custom-scrollbar">
        <div className="min-w-[400px] p-4">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `80px repeat(${tickers.length}, 1fr)`,
            }}
          >
            {/* Header row */}
            <div className="h-8"></div>
            {tickers.map(t => (
              <div
                key={t}
                className="h-8 flex items-center justify-center text-[10px] font-bold border-b border-l border-border/50"
              >
                {t}
              </div>
            ))}

            {/* Matrix rows */}
            {tickers.map((t1, i) => (
              <>
                <div
                  key={`row-${t1}`}
                  className="h-10 flex items-center pr-2 text-[10px] font-bold border-r border-border/50"
                >
                  {t1}
                </div>
                {matrix[i].map((val, j) => (
                  <div
                    key={`${t1}-${tickers[j]}`}
                    className={`h-10 flex items-center justify-center text-[11px] font-mono border-b border-l border-border/20 transition-all hover:scale-105 hover:z-10 cursor-default ${getBgColor(val)}`}
                    title={`${t1} & ${tickers[j]}: ${val}`}
                  >
                    {val.toFixed(2)}
                  </div>
                ))}
              </>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500/80 rounded-sm"></div> 고동조
              (양의 상관)
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-neutral-500/20 rounded-sm"></div> 중립
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-600/80 rounded-sm"></div> 역동조
              (음의 상관)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
