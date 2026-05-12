import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useState } from "react";

export default function OptionsFlow() {
  const [ticker, setTicker] = useState("SPY");
  const [query, setQuery] = useState("SPY");

  const { data, isLoading, isFetching } = trpc.insights.optionsFlow.useQuery(
    { ticker: query },
    {
      staleTime: 15 * 60 * 1000,
      enabled: !!query,
    }
  );

  const sentimentColor = {
    Bullish: "text-green-500 border-green-500/30 bg-green-500/10",
    Bearish: "text-red-500 border-red-500/30 bg-red-500/10",
    Neutral: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-primary" /> 옵션 흐름 추적
          </h1>
          <p className="text-muted-foreground mt-2">
            비정상적인 옵션 거래를 탐지해 기관·스마트머니의 방향성을 추정합니다.
          </p>
        </div>

        <div className="flex gap-3">
          <Input
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="SPY"
            className="w-32 font-mono"
            onKeyDown={e => e.key === "Enter" && setQuery(ticker)}
          />
          <Button
            onClick={() => setQuery(ticker)}
            disabled={isFetching}
            className="gap-2"
          >
            <Zap className="w-4 h-4" /> 조회
          </Button>
        </div>

        {isLoading || isFetching ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-lg">{data.ticker}</span>
              <Badge
                className={`${sentimentColor[data.sentiment as keyof typeof sentimentColor]} border font-bold`}
              >
                {data.sentiment === "Bullish"
                  ? "🐂 강세"
                  : data.sentiment === "Bearish"
                    ? "🐻 약세"
                    : "⚖️ 중립"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Call {data.calls.length}건 · Put {data.puts.length}건
              </span>
            </div>

            {data.unusual.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>비정상적인 옵션 활동이 탐지되지 않았습니다.</p>
                  <p className="text-xs mt-1">
                    거래량이 많은 주식 ETF(SPY, QQQ, AAPL 등)를 조회해보세요.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">종류</th>
                      <th className="px-4 py-3 text-right">행사가</th>
                      <th className="px-4 py-3 text-center">만기일</th>
                      <th className="px-4 py-3 text-right">거래량</th>
                      <th className="px-4 py-3 text-right">미결제약정</th>
                      <th className="px-4 py-3 text-right">V/OI 비율</th>
                      <th className="px-4 py-3 text-right">IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unusual.map((opt: any, i: number) => (
                      <tr
                        key={i}
                        className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${opt.volOIRatio > 5 ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <Badge
                            className={`${opt.type === "CALL" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"} border-none text-[10px]`}
                          >
                            {opt.type === "CALL" ? "📈 CALL" : "📉 PUT"}
                          </Badge>
                          {opt.volOIRatio > 5 && (
                            <span className="ml-2 text-[10px] text-yellow-500">
                              ⚡ 급등
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ${opt.strike.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                          {opt.expiry}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {opt.volume.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {opt.openInterest.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-bold ${opt.volOIRatio > 3 ? "text-yellow-500" : ""}`}
                          >
                            {opt.volOIRatio.toFixed(1)}x
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {opt.impliedVolatility
                            ? `${(opt.impliedVolatility * 100).toFixed(1)}%`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/50 text-right">
              V/OI = 거래량/미결제약정 비율. 3x 이상은 비정상적으로 높은 활동을
              의미합니다.
            </p>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
