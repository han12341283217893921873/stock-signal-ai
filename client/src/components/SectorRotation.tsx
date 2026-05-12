import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const TIMEFRAMES = [
  { label: "1주", value: "1W" },
  { label: "1달", value: "1M" },
  { label: "3달", value: "3M" },
] as const;

export default function SectorRotation() {
  const [timeframe, setTimeframe] =
    useState<(typeof TIMEFRAMES)[number]["value"]>("1W");
  const { data: sectors, isLoading } = trpc.macro.sectorRotation.useQuery();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">섹터 로테이션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!sectors) return null;

  const sortedSectors = [...sectors].sort(
    (a, b) => b.returns[timeframe] - a.returns[timeframe]
  );

  const maxAbsReturn = Math.max(
    ...sectors.map(s => Math.abs(s.returns[timeframe]))
  );
  const getWidth = (val: number) => {
    if (maxAbsReturn === 0) return 0;
    return Math.min((Math.abs(val) / maxAbsReturn) * 100, 100);
  };

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> 섹터 순환 분석
        </CardTitle>
        <Tabs value={timeframe} onValueChange={v => setTimeframe(v as any)}>
          <TabsList className="h-7 bg-muted/50 p-0.5">
            {TIMEFRAMES.map(tf => (
              <TabsTrigger
                key={tf.value}
                value={tf.value}
                className="text-[10px] px-2 h-6"
              >
                {tf.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2.5">
          {sortedSectors.map(s => (
            <div key={s.ticker} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {s.sector}{" "}
                  <span className="text-[10px] opacity-50 ml-1">
                    {s.ticker}
                  </span>
                </span>
                <span
                  className={`font-mono font-bold ${s.returns[timeframe] >= 0 ? "text-bull" : "text-bear"}`}
                >
                  {s.returns[timeframe] > 0 ? "+" : ""}
                  {s.returns[timeframe]}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden flex">
                {/* Center point indicator */}
                <div className="flex-1 flex justify-end">
                  {s.returns[timeframe] < 0 && (
                    <div
                      className="bg-bear/60 h-full rounded-l-sm"
                      style={{ width: `${getWidth(s.returns[timeframe])}%` }}
                    ></div>
                  )}
                </div>
                <div className="w-[1px] bg-border z-10"></div>
                <div className="flex-1">
                  {s.returns[timeframe] > 0 && (
                    <div
                      className="bg-bull/60 h-full rounded-r-sm"
                      style={{ width: `${getWidth(s.returns[timeframe])}%` }}
                    ></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <BarChart3 className="h-3 w-3" /> 주요 섹터 ETF 수익률 기반 분석
        </p>
      </CardContent>
    </Card>
  );
}
