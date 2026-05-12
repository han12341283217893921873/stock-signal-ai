import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import VoiceNarration from "./VoiceNarration";

interface TechnicalReportProps {
  ticker: string;
}

export default function TechnicalReport({ ticker }: TechnicalReportProps) {
  const {
    data: report,
    isLoading,
    error,
  } = trpc.chartPattern.generateReport.useQuery({ ticker });
  const [displayedSummary, setDisplayedSummary] = useState("");
  const [displayedDiagnosis, setDisplayedDiagnosis] = useState("");

  useEffect(() => {
    if (!report) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedSummary(report.summary.slice(0, i));
      i++;
      if (i > report.summary.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [report?.summary]);

  useEffect(() => {
    if (!report) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedDiagnosis(report.diagnosis.slice(0, i));
      i++;
      if (i > report.diagnosis.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [report?.diagnosis]);

  if (isLoading) {
    return (
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary animate-pulse" />
            AI 종합 분석 리포트 생성 중...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !report) return null;

  const actionColors = {
    매수: "bg-bull/10 text-bull border-bull/20",
    매도: "bg-bear/10 text-bear border-bear/20",
    관망: "bg-muted text-muted-foreground border-border",
  };

  const ActionIcon =
    report.strategy.action === "매수"
      ? TrendingUp
      : report.strategy.action === "매도"
        ? TrendingDown
        : Zap;

  const narrationText = `AI 투자 전략 리포트입니다. 요약: ${report.summary}. 진단: ${report.diagnosis}. 단기 전망: ${report.shortTerm}. 중기 전망: ${report.midTerm}. 추천 전략은 ${report.strategy.action}이며, 진입가는 ${report.strategy.entry}, 목표가는 ${report.strategy.target}, 손절가는 ${report.strategy.stopLoss}입니다. 주의 리스크는 ${report.riskFactor}입니다.`;

  return (
    <Card className="glass-card border-primary/20 overflow-hidden shadow-lg group">
      <CardHeader className="pb-2 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              AI 투자 전략 리포트
            </CardTitle>
            <VoiceNarration text={narrationText} />
          </div>
          <Badge
            variant="outline"
            className={`font-bold ${actionColors[report.strategy.action as keyof typeof actionColors] || actionColors["관망"]}`}
          >
            <ActionIcon className="h-3 w-3 mr-1" />
            {report.strategy.action}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground leading-tight min-h-[1.5em]">
            "{displayedSummary}"
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed italic min-h-[3em]">
            {displayedDiagnosis}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Zap className="h-3 w-3" /> 단기 전망 (1-2주)
            </h5>
            <p className="text-xs">{report.shortTerm}</p>
          </div>
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> 중기 전망 (1-3개월)
            </h5>
            <p className="text-xs">{report.midTerm}</p>
          </div>
        </div>

        <div className="bg-background/40 rounded-xl p-3 border border-border/50 grid grid-cols-3 gap-2">
          <div className="text-center border-r border-border/50">
            <p className="text-[9px] text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Zap className="h-2.5 w-2.5" /> 진입가
            </p>
            <p className="text-xs font-mono font-bold text-primary">
              {report.strategy.entry}
            </p>
          </div>
          <div className="text-center border-r border-border/50">
            <p className="text-[9px] text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Target className="h-2.5 w-2.5" /> 목표가
            </p>
            <p className="text-xs font-mono font-bold text-bull">
              {report.strategy.target}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <ShieldAlert className="h-2.5 w-2.5" /> 손절가
            </p>
            <p className="text-xs font-mono font-bold text-bear">
              {report.strategy.stopLoss}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                주의 리스크
              </p>
              <p className="text-[10px] text-muted-foreground">
                {report.riskFactor}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
