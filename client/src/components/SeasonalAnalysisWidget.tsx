import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface SeasonalAnalysisWidgetProps {
  ticker: string;
}

export default function SeasonalAnalysisWidget({
  ticker,
}: SeasonalAnalysisWidgetProps) {
  const { data: stats, isLoading } = trpc.stock.seasonalAnalysis.useQuery({
    ticker,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!stats || stats.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          계절성 분석 (Seasonal Trends)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">
          지난 2~5년간의 월별 평균 수익률을 분석하여 통계적으로 유리한 달을
          파악합니다.
        </p>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats}
              margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
            >
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={m => `${m}월`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(val: number) => [`${val}%`, "평균 수익률"]}
                labelFormatter={m => `${m}월 통계`}
              />
              <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
                {stats.map((entry: any, index: number) => (
                  <Cell
                    key={index}
                    fill={
                      entry.avgReturn >= 0
                        ? "rgba(34, 197, 94, 0.6)"
                        : "rgba(239, 68, 68, 0.6)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-bull/5 border border-bull/10">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3 w-3 text-bull" />
              <span className="text-[10px] font-bold text-bull uppercase">
                Best Month
              </span>
            </div>
            <p className="text-sm font-black">
              {[...stats].sort((a, b) => b.avgReturn - a.avgReturn)[0].month}월
            </p>
            <p className="text-[9px] text-muted-foreground">
              평균 +
              {
                [...stats].sort((a, b) => b.avgReturn - a.avgReturn)[0]
                  .avgReturn
              }
              %
            </p>
          </div>
          <div className="p-2 rounded-lg bg-bear/5 border border-bear/10">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-3 w-3 text-bear" />
              <span className="text-[10px] font-bold text-bear uppercase">
                Worst Month
              </span>
            </div>
            <p className="text-sm font-black">
              {[...stats].sort((a, b) => a.avgReturn - b.avgReturn)[0].month}월
            </p>
            <p className="text-[9px] text-muted-foreground">
              평균{" "}
              {
                [...stats].sort((a, b) => a.avgReturn - b.avgReturn)[0]
                  .avgReturn
              }
              %
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
