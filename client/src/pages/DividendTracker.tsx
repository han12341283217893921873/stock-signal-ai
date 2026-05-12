import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  PiggyBank,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function DividendTracker() {
  const { data, isLoading, refetch, isFetching } =
    trpc.insights.dividendTracker.useQuery(undefined, {
      staleTime: 30 * 60 * 1000,
    });

  const chartData =
    data?.positions?.map((p: any) => ({
      name: p.ticker,
      annual: Number(p.annualDividendTotal.toFixed(2)),
      yield: Number(p.dividendYield.toFixed(2)),
    })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <PiggyBank className="w-8 h-8 text-primary" /> 배당 추적기
            </h1>
            <p className="text-muted-foreground mt-2">
              보유 종목의 배당 일정 및 연간 배당 수익을 확인합니다.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />{" "}
            새로고침
          </Button>
        </div>

        {/* 연간 배당 총액 카드 */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-primary/20 md:col-span-1">
              <CardContent className="pt-6 text-center">
                <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  연간 예상 배당 총액
                </p>
                <p className="text-3xl font-black font-mono text-primary mt-1">
                  ${data.totalAnnualDividend.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  월 평균 ${(data.totalAnnualDividend / 12).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">종목별 연간 배당 수익</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(v: number) => [
                          `$${v.toFixed(2)}`,
                          "연간 배당",
                        ]}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                      <Bar dataKey="annual" radius={4}>
                        {chartData.map((_: any, i: number) => (
                          <Cell
                            key={i}
                            fill={`hsl(${200 + i * 25}, 70%, 60%)`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    배당 데이터 없음
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : !data?.positions?.length ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <PiggyBank className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                포트폴리오에 배당주를 추가하면 배당 정보가 표시됩니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">종목</th>
                  <th className="px-4 py-3 text-right">보유수량</th>
                  <th className="px-4 py-3 text-right">배당 수익률</th>
                  <th className="px-4 py-3 text-right">주당 배당금</th>
                  <th className="px-4 py-3 text-right">연간 배당 수익</th>
                  <th className="px-4 py-3 text-right">배당 지급일</th>
                  <th className="px-4 py-3 text-center">주기</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.map((pos: any, i: number) => (
                  <tr
                    key={i}
                    className="border-t border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold font-mono">
                      {pos.ticker}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pos.quantity.toLocaleString()}주
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${pos.dividendYield > 0 ? "text-green-500" : "text-muted-foreground"}`}
                    >
                      {pos.dividendYield > 0
                        ? `${pos.dividendYield.toFixed(2)}%`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {pos.annualDividendPerShare > 0
                        ? `$${pos.annualDividendPerShare.toFixed(4)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-500">
                      {pos.annualDividendTotal > 0
                        ? `$${pos.annualDividendTotal.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {pos.payDate
                        ? new Date(pos.payDate).toLocaleDateString("ko-KR")
                        : pos.lastExDate
                          ? `Ex: ${new Date(pos.lastExDate).toLocaleDateString("ko-KR")}`
                          : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {pos.frequency}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
