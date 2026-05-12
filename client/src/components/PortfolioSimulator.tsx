import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, History, Info } from "lucide-react";

export default function PortfolioSimulator() {
  const { data: backtest, isLoading } = trpc.portfolio.backtestAll.useQuery();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!backtest || backtest.history.length === 0) return null;

  // 날짜 기반 매핑으로 Alpha 버그 수정
  const benchmarkMap = new Map(
    (backtest.benchmark ?? []).map((b: any) => [b.date, Number(b.change)])
  );

  const lastHistory = backtest.history[backtest.history.length - 1];
  const lastPortfolioChange: number = Number(lastHistory.change);
  const lastBenchmarkChange: number =
    (benchmarkMap.get(lastHistory.date) as number | undefined) ??
    (backtest.benchmark?.length > 0
      ? Number(backtest.benchmark[backtest.benchmark.length - 1].change)
      : 0);
  const alpha = (lastPortfolioChange - lastBenchmarkChange).toFixed(2);

  const combinedData = backtest.history
    .map((h: any) => ({
      date: h.date,
      portfolio: Number(h.change),
      benchmark: benchmarkMap.get(h.date) ?? null,
    }))
    .filter((d: any) => d.portfolio !== undefined);

  return (
    <Card className="glass-card border-primary/20 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              포트폴리오 성과 시뮬레이션
            </CardTitle>
            <CardDescription className="text-xs">
              최근 1년 기준, S&P 500(SPY) 대비 내 포트폴리오의 수익률
              추이입니다.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
              Alpha (Benchmark 대비)
            </p>
            <p
              className={`text-xl font-black font-mono ${Number(alpha) >= 0 ? "text-bull" : "text-bear"}`}
            >
              {Number(alpha) >= 0 ? "+" : ""}
              {alpha}%
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                minTickGap={30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "12px",
                  backdropFilter: "blur(4px)",
                }}
                itemStyle={{ padding: "2px 0" }}
              />
              <Area
                type="monotone"
                dataKey="portfolio"
                name="내 포트폴리오"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPortfolio)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                name="S&P 500 (SPY)"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 p-3 bg-muted/30 rounded-xl border border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold">
                포트폴리오 누적
              </p>
              <p
                className={`text-sm font-black font-mono ${Number(lastHistory.change) >= 0 ? "text-bull" : "text-bear"}`}
              >
                {Number(lastHistory.change) >= 0 ? "+" : ""}
                {lastHistory.change}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-l border-border/50 pl-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold">
                벤치마크 (SPY)
              </p>
              <p
                className={`text-sm font-black font-mono ${lastBenchmarkChange >= 0 ? "text-bull" : "text-bear"}`}
              >
                {lastBenchmarkChange >= 0 ? "+" : ""}
                {lastBenchmarkChange.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
