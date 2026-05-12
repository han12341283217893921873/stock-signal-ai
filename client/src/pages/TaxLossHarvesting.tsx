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
  Target,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Scissors,
} from "lucide-react";

export default function TaxLossHarvesting() {
  const { data, isLoading, refetch, isFetching } =
    trpc.insights.taxLossHarvesting.useQuery(undefined, {
      staleTime: 15 * 60 * 1000,
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Scissors className="w-8 h-8 text-primary" /> 절세 전략 (Tax-Loss
              Harvesting)
            </h1>
            <p className="text-muted-foreground mt-2">
              손실 포지션을 청산해 수익 포지션의 세금을 상쇄하는 전략입니다.
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

        {/* 절세 요약 */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                label: "실현 가능 손실",
                value: `$${data.totalRealizedLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                color: "text-red-500",
                icon: TrendingDown,
              },
              {
                label: "실현 가능 수익",
                value: `$${data.totalRealizedGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                color: "text-green-500",
                icon: TrendingUp,
              },
              {
                label: "상쇄 가능 금액",
                value: `$${data.netHarvestable.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                color: "text-primary",
                icon: Target,
              },
              {
                label: "절세 예상액 (22%)",
                value: `$${data.estimatedTaxSaving.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                color: "text-yellow-500",
                icon: Scissors,
              },
            ].map(({ label, value, color, icon: Icon }) => (
              <Card key={label} className="glass-card">
                <CardContent className="pt-5 text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-black font-mono ${color}`}>
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-sm text-yellow-600 dark:text-yellow-400">
          ⚠️ 절세 전략은 세무 전문가와 상담 후 실행하세요. 동일 종목을 30일 이내
          재매수 시 "Wash Sale" 규정이 적용될 수 있습니다.
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 손실 포지션 */}
            <div>
              <h2 className="text-base font-bold flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-500" /> 청산 후보
                (손실 포지션)
                {data?.losers && data.losers.length > 0 && (
                  <Badge variant="outline">{data.losers.length}종목</Badge>
                )}
              </h2>
              {data?.losers?.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    손실 포지션이 없습니다 🎉
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {data?.losers?.map((pos: any, i: number) => (
                    <Card key={i} className="glass-card border-red-500/20">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold">
                              {pos.ticker}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {pos.qty}주
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-red-500 font-bold font-mono">
                              {pos.pnlPct.toFixed(2)}%
                            </p>
                            <p className="text-xs text-red-500/70">
                              ${pos.pnl.toFixed(0)} 손실
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>평단 ${pos.avg.toFixed(2)}</span>
                          <span>현재 ${pos.price.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 수익 포지션 */}
            <div>
              <h2 className="text-base font-bold flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-500" /> 과세 대상
                (수익 포지션)
                {data?.winners && data.winners.length > 0 && (
                  <Badge variant="outline">{data.winners.length}종목</Badge>
                )}
              </h2>
              {data?.winners?.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    수익 포지션이 없습니다
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {data?.winners?.map((pos: any, i: number) => (
                    <Card key={i} className="glass-card border-green-500/20">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold">
                              {pos.ticker}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {pos.qty}주
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-green-500 font-bold font-mono">
                              +{pos.pnlPct.toFixed(2)}%
                            </p>
                            <p className="text-xs text-green-500/70">
                              ${pos.pnl.toFixed(0)} 수익
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>평단 ${pos.avg.toFixed(2)}</span>
                          <span>현재 ${pos.price.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
