import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, TrendingUp, Activity, BarChart3 } from "lucide-react";

export default function PortfolioRiskAnalysis() {
  const { data: risk, isLoading } = trpc.portfolio.riskAnalysis.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full glass-card" />
        ))}
      </div>
    );
  }

  if (!risk) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              최대 낙폭 (MDD)
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-red-500">
            -{risk.mdd.toFixed(2)}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            고점 대비 최대 하락폭
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              샤프 지수
            </span>
          </div>
          <p
            className={`text-2xl font-bold font-mono ${risk.sharpeRatio > 1 ? "text-emerald-500" : "text-yellow-500"}`}
          >
            {risk.sharpeRatio}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            위험 대비 수익 효율성
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              변동성 (연율화)
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-blue-400">
            {risk.volatility}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            연간 예상 가격 변동폭
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              누적 수익률
            </span>
          </div>
          <p
            className={`text-2xl font-bold font-mono ${risk.totalReturn >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            {risk.totalReturn >= 0 ? "+" : ""}
            {risk.totalReturn}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            전체 투자 기간 총 수익
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
