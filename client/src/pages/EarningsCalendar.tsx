import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EarningsCalendarPage() {
  const { data, isLoading, refetch, isFetching } =
    trpc.insights.earningsCalendar.useQuery(undefined, {
      staleTime: 60 * 60 * 1000,
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" /> 실적 발표 캘린더
            </h1>
            <p className="text-muted-foreground mt-2">
              보유 종목의 실적 발표일과 EPS 예상치를 추적합니다.
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

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : !data?.upcoming?.length ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                포트폴리오에 미국 주식을 추가하면 실적 발표일을 추적합니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.upcoming.map((item: any, i: number) => {
              const beat =
                item.actual != null && item.estimate != null
                  ? item.actual >= item.estimate
                    ? "beat"
                    : "miss"
                  : null;
              return (
                <Card
                  key={i}
                  className="glass-card hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="font-mono text-xl">
                        {item.ticker}
                      </CardTitle>
                      {beat === "beat" && (
                        <Badge className="bg-green-500/20 text-green-500 border-none">
                          ✓ Beat
                        </Badge>
                      )}
                      {beat === "miss" && (
                        <Badge className="bg-red-500/20 text-red-500 border-none">
                          ✗ Miss
                        </Badge>
                      )}
                      {!beat && <Badge variant="outline">예정</Badge>}
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.date
                        ? new Date(item.date).toLocaleDateString("ko-KR")
                        : "날짜 미정"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">
                          EPS 예상
                        </p>
                        <p className="font-bold font-mono text-sm">
                          {item.estimatesEps != null
                            ? `$${item.estimatesEps.toFixed(2)}`
                            : "N/A"}
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-lg border text-center ${item.actual != null ? (beat === "beat" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20") : "bg-muted/30 border-border/50"}`}
                      >
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">
                          EPS 실제
                        </p>
                        <p
                          className={`font-bold font-mono text-sm ${beat === "beat" ? "text-green-500" : beat === "miss" ? "text-red-500" : ""}`}
                        >
                          {item.actual != null
                            ? `$${item.actual.toFixed(2)}`
                            : "발표 전"}
                        </p>
                      </div>
                    </div>
                    {item.surprisePercent != null && (
                      <div
                        className={`mt-3 text-center text-sm font-bold flex items-center justify-center gap-1 ${item.surprisePercent >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {item.surprisePercent >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        서프라이즈 {item.surprisePercent >= 0 ? "+" : ""}
                        {item.surprisePercent.toFixed(1)}%
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {data?.updatedAt && (
          <p className="text-[10px] text-muted-foreground/50 text-right">
            업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
