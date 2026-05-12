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
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Globe,
  RefreshCw,
} from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export default function GlobalRiskAnalysis() {
  const { data, isLoading, refetch, isFetching } =
    trpc.insights.globalRisk.useQuery(undefined, {
      staleTime: 30 * 60 * 1000,
    });

  const riskColors = {
    Low: "text-green-500",
    Moderate: "text-yellow-500",
    High: "text-red-500",
  };
  const riskBg = {
    Low: "bg-green-500/10 border-green-500/20",
    Moderate: "bg-yellow-500/10 border-yellow-500/20",
    High: "bg-red-500/10 border-red-500/20",
  };
  const riskLabel = { Low: "낮음", Moderate: "보통", High: "높음" };

  const gaugeData = data
    ? [
        {
          name: "Risk",
          value: data.riskScore,
          fill:
            data.riskLevel === "High"
              ? "#ef4444"
              : data.riskLevel === "Moderate"
                ? "#f59e0b"
                : "#10b981",
        },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" /> 글로벌 리스크 분석
            </h1>
            <p className="text-muted-foreground mt-2">
              VIX, 공포탐욕지수, 글로벌 시장을 종합한 리스크 대시보드
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* 상단 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card
                className={`glass-card border ${riskBg[data.riskLevel as keyof typeof riskBg]}`}
              >
                <CardContent className="pt-5 text-center">
                  <ShieldAlert
                    className={`w-8 h-8 mx-auto mb-2 ${riskColors[data.riskLevel as keyof typeof riskColors]}`}
                  />
                  <p className="text-xs text-muted-foreground">리스크 수준</p>
                  <p
                    className={`text-2xl font-black ${riskColors[data.riskLevel as keyof typeof riskColors]}`}
                  >
                    {riskLabel[data.riskLevel as keyof typeof riskLabel]}
                  </p>
                  <p className="text-4xl font-black font-mono mt-1">
                    {data.riskScore}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/100</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    VIX 공포지수
                  </p>
                  <p
                    className={`text-3xl font-black font-mono ${data.vix >= 30 ? "text-red-500" : data.vix >= 20 ? "text-yellow-500" : "text-green-500"}`}
                  >
                    {data.vix.toFixed(1)}
                  </p>
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    {data.vix >= 30
                      ? "🔴 극단적 공포"
                      : data.vix >= 20
                        ? "🟡 불안"
                        : "🟢 안정"}
                  </Badge>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    공포탐욕지수
                  </p>
                  <p
                    className={`text-3xl font-black font-mono ${data.fearGreed.score < 30 ? "text-red-500" : data.fearGreed.score > 70 ? "text-green-500" : "text-yellow-500"}`}
                  >
                    {data.fearGreed.score}
                  </p>
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    {data.fearGreed.label}
                  </Badge>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-2">
                    글로벌 시장
                  </p>
                  <div className="space-y-1">
                    {data.indices.slice(0, 4).map((idx: any) => (
                      <div
                        key={idx.ticker}
                        className="flex justify-between text-xs"
                      >
                        <span className="text-muted-foreground truncate max-w-[80px]">
                          {idx.name}
                        </span>
                        <span
                          className={`font-mono font-bold ${idx.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {idx.changePercent >= 0 ? "+" : ""}
                          {idx.changePercent?.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI 분석 */}
            {data.aiAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-card md:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      🤖 AI 종합 진단
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {data.aiAnalysis.summary}
                    </p>
                    {data.aiAnalysis.recommendation && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs font-bold text-primary mb-1">
                          전략 제안
                        </p>
                        <p className="text-sm">
                          {data.aiAnalysis.recommendation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-500" /> 주요
                      리스크
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.aiAnalysis.topRisks?.map((r: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-red-500 mt-0.5">▸</span>
                          <span className="text-muted-foreground">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" /> 투자
                      기회
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.aiAnalysis.opportunities?.map(
                        (o: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span className="text-green-500 mt-0.5">▸</span>
                            <span className="text-muted-foreground">{o}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
            {data.updatedAt && (
              <p className="text-[10px] text-muted-foreground/50 text-right">
                업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")}
              </p>
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
