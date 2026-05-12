import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FinancialAnomalyWidgetProps {
  ticker: string;
}

export default function FinancialAnomalyWidget({
  ticker,
}: FinancialAnomalyWidgetProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const anomalyMutation = trpc.ai.detectAnomalies.useMutation();

  const handleStart = () => {
    setHasStarted(true);
    anomalyMutation.mutate({ ticker });
  };

  if (!hasStarted) {
    return (
      <Card className="glass-card border-amber-500/20 bg-amber-500/5">
        <CardContent className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
          <ShieldAlert className="h-8 w-8 text-amber-500" />
          <div>
            <h4 className="text-sm font-bold">재무 이상 징후 진단</h4>
            <p className="text-[10px] text-muted-foreground mt-1">
              AI 회계사가 분식회계 가능성과 부도 위험을 진단합니다.
            </p>
          </div>
          <Button
            onClick={handleStart}
            size="sm"
            variant="outline"
            className="border-amber-500/40 hover:bg-amber-500/10 h-8"
          >
            진단 시작
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isLoading = anomalyMutation.isPending;
  const data = anomalyMutation.data;

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  if (!data) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          재무 포렌식 리포트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">위험도:</span>
            <Badge
              className={`${
                data.riskLevel === "Low"
                  ? "bg-bull/20 text-bull"
                  : data.riskLevel === "Medium"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-bear/20 text-bear"
              } border-none`}
            >
              {data.riskLevel}
            </Badge>
          </div>
          <span className="text-xs font-mono font-bold">{data.score}/100</span>
        </div>
        <Progress value={data.score} className="h-1.5" />

        <p className="text-xs font-medium text-foreground/90 bg-muted/30 p-2 rounded-lg border border-border/40 italic leading-snug">
          &quot;{data.summary}&quot;
        </p>

        <div className="space-y-2">
          {data.flags.map((flag: any, i: number) => (
            <div
              key={i}
              className={`flex gap-2 p-2 rounded-md border ${
                flag.type === "danger"
                  ? "bg-bear/5 border-bear/20"
                  : "bg-yellow-500/5 border-yellow-500/20"
              }`}
            >
              {flag.type === "danger" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-bear shrink-0" />
              ) : (
                <Activity className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-bold ${flag.type === "danger" ? "text-bear" : "text-yellow-500"}`}
                >
                  {flag.title}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {flag.description}
                </p>
              </div>
            </div>
          ))}
          {data.flags.length === 0 && (
            <div className="flex items-center gap-2 text-bull py-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-bold">특이사항 없음 (건전함)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
