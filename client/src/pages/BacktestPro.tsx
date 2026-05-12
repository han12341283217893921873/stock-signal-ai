import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

const COLORS_STRATEGY = ["#6366f1", "#22d3ee", "#10b981", "#f59e0b"];

export default function BacktestPro() {
  const [ticker, setTicker] = useState("AAPL");
  const [period, setPeriod] = useState<"6mo" | "1y" | "2y">("1y");
  const mutation = trpc.insights.multiBacktest.useMutation();

  const run = () => mutation.mutate({ ticker: ticker.toUpperCase(), period });

  const medals = ["🥇", "🥈", "🥉", "4️⃣"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-primary" /> 멀티 전략 백테스트
          </h1>
          <p className="text-muted-foreground mt-2">
            RSI, MA 골든크로스, 볼린저 밴드, 바이앤홀드 전략을 한번에
            비교합니다.
          </p>
        </div>

        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                placeholder="티커 (예: AAPL)"
                className="sm:w-40 font-mono"
                onKeyDown={e => e.key === "Enter" && run()}
              />
              <Select value={period} onValueChange={v => setPeriod(v as any)}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6mo">6개월</SelectItem>
                  <SelectItem value="1y">1년</SelectItem>
                  <SelectItem value="2y">2년</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={run}
                disabled={mutation.isPending}
                className="gap-2 sm:min-w-32"
              >
                <RefreshCw
                  className={`w-4 h-4 ${mutation.isPending ? "animate-spin" : ""}`}
                />
                {mutation.isPending ? "분석 중..." : "백테스트 실행"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ 과거 수익률은 미래를 보장하지 않습니다. 투자 참고용으로만
              활용하세요.
            </p>
          </CardContent>
        </Card>

        {mutation.isPending && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        )}

        {mutation.data && !mutation.isPending && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {mutation.data.strategies.map((s: any, i: number) => (
                <Card
                  key={i}
                  className={`glass-card border transition-colors ${i === 0 ? "border-yellow-500/40 shadow-yellow-500/10 shadow-lg" : ""}`}
                >
                  <CardContent className="pt-5 pb-4 text-center">
                    <div className="text-2xl mb-1">{medals[i]}</div>
                    <h3 className="font-bold text-sm mb-3">{s.name}</h3>
                    <div
                      className={`text-3xl font-black font-mono mb-1 ${s.returnPct >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {s.returnPct >= 0 ? "+" : ""}
                      {s.returnPct.toFixed(1)}%
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                      <div>
                        <p>거래 횟수</p>
                        <p className="font-bold text-foreground">
                          {s.trades}회
                        </p>
                      </div>
                      <div>
                        <p>승률</p>
                        <p
                          className={`font-bold ${s.winRate >= 50 ? "text-green-500" : "text-red-500"}`}
                        >
                          {s.winRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">전략별 수익률 비교</CardTitle>
                <CardDescription>
                  {mutation.data.ticker} ·{" "}
                  {period === "6mo" ? "6개월" : period === "1y" ? "1년" : "2년"}{" "}
                  백테스트 결과
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={mutation.data.strategies}
                    layout="vertical"
                    margin={{ left: 80, right: 20 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={v => `${v.toFixed(0)}%`}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(2)}%`, "수익률"]}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine x={0} stroke="var(--border)" />
                    <Bar dataKey="returnPct" radius={4}>
                      {mutation.data.strategies.map((s: any, i: number) => (
                        <Cell
                          key={i}
                          fill={s.returnPct >= 0 ? "#10b981" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
