import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export default function PortfolioStressTest() {
  const { data: scenarios, isLoading } = trpc.portfolio.stressTest.useQuery();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!scenarios) return null;

  return (
    <Card className="glass-card border-bear/20 bg-bear/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-bear">
          <ShieldAlert className="h-4 w-4" />
          포트폴리오 스트레스 테스트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          과거 역사적인 폭락장이 지금 다시 발생했을 때, 현재 사용자님의
          포트폴리오(총 투자금 기준)가 입을 수 있는 잠재적 손실을
          시뮬레이션합니다.
        </p>
        <div className="space-y-3">
          {scenarios.map((s: any, i: number) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-background/50 border border-border/50"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="text-xs font-bold flex items-center gap-1">
                    {s.name}{" "}
                    <span className="text-[10px] text-bear font-mono">
                      ({(s.drop * 100).toFixed(0)}%)
                    </span>
                  </h5>
                  <p className="text-[9px] text-muted-foreground">
                    {s.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-bear">
                    -{s.estimatedLoss.toLocaleString()} 원
                  </p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-bear transition-all duration-1000"
                  style={{ width: `${Math.abs(s.drop * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground">
                  잔존 예상 가치
                </span>
                <span className="text-[9px] font-bold text-foreground">
                  {s.remainingValue.toLocaleString()} 원
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2 flex items-start gap-2 border-t border-border/40">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-[9px] text-muted-foreground italic">
            본 테스트는 단순 하락폭을 기준으로 한 시뮬레이션이며, 실제 개별
            종목의 변동성(Beta)에 따라 결과는 달라질 수 있습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
