import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Target,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

export default function BreakevenPage() {
  const { data, isLoading, refetch, isFetching } =
    trpc.insights.breakeven.useQuery(undefined, {
      staleTime: 5 * 60 * 1000,
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" /> 손익분기점 & 목표가
              계산기
            </h1>
            <p className="text-muted-foreground mt-2">
              각 포지션의 손절선, 손익분기점, 목표가별 예상 수익을 계산합니다.
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
            />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : !data?.positions?.length ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              포트폴리오에 종목을 추가하면 손익분기점이 계산됩니다.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.positions.map((pos: any, i: number) => {
              const isProfit = pos.pnlPct >= 0;
              const distFromBE =
                pos.currentPrice > 0
                  ? ((pos.currentPrice - pos.breakevenPrice) /
                      pos.currentPrice) *
                    100
                  : 0;

              return (
                <Card
                  key={i}
                  className={`glass-card border ${isProfit ? "border-green-500/20" : "border-red-500/20"}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <CardTitle className="font-mono text-lg">
                          {pos.ticker}
                        </CardTitle>
                        <Badge
                          className={
                            isProfit
                              ? "bg-green-500/20 text-green-500 border-none"
                              : "bg-red-500/20 text-red-500 border-none"
                          }
                        >
                          {isProfit ? (
                            <TrendingUp className="w-3 h-3 mr-1 inline" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1 inline" />
                          )}
                          {isProfit ? "+" : ""}
                          {pos.pnlPct.toFixed(2)}%
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">현재가</p>
                        <p className="font-bold font-mono">
                          ${pos.currentPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 손절/손익분기/현재가 게이지 */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>손절 -10% (${pos.stopLoss10.toFixed(2)})</span>
                        <span>손익분기 (${pos.breakevenPrice.toFixed(2)})</span>
                        <span>현재 ${pos.currentPrice.toFixed(2)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30 rounded-full" />
                        {/* 현재가 마커 */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
                          style={{
                            left: `${Math.min(Math.max(50 + distFromBE * 5, 2), 98)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* 손절선 */}
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
                        <p className="text-[10px] text-red-500/70 mb-1">
                          손절선 (-5%)
                        </p>
                        <p className="font-bold font-mono text-red-500">
                          ${pos.stopLoss5.toFixed(2)}
                        </p>
                      </div>
                      {/* 목표가들 */}
                      {pos.targetPrices.slice(0, 3).map((tp: any) => (
                        <div
                          key={tp.pct}
                          className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 text-center"
                        >
                          <p className="text-[10px] text-green-500/70 mb-1">
                            목표 +{tp.pct}%
                          </p>
                          <p className="font-bold font-mono text-green-500">
                            ${tp.price.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            +${tp.gain.toFixed(0)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                      <div>
                        <p className="text-muted-foreground">평균 매입가</p>
                        <p className="font-mono font-bold">
                          ${pos.avgPrice.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">보유 수량</p>
                        <p className="font-mono font-bold">{pos.quantity}주</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">미실현 손익</p>
                        <p
                          className={`font-mono font-bold ${pos.pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
