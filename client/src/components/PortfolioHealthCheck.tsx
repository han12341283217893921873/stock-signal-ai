import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldCheck, AlertTriangle, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PortfolioHealthCheck() {
  const { data, isLoading } = trpc.portfolio.healthCheck.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="glass-card premium-border animate-pulse">
        <CardContent className="p-10 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-bold text-primary">AI가 포트폴리오를 정밀 검진 중입니다...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.status === "empty") {
    return (
      <Card className="glass-card border-dashed border-primary/30">
        <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <Activity className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{data?.summary || "포트폴리오에 종목이 없습니다."}</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-emerald-400";
      case "good": return "text-blue-400";
      case "warning": return "text-orange-400";
      case "danger": return "text-red-400";
      default: return "text-primary";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="glass-card premium-border overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            AI 포트폴리오 정밀 건강검진
          </div>
          <Badge variant="outline" className={`font-black ${getStatusColor(data.status)}`}>
            {data.status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {/* 점수 섹션 */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative h-24 w-24 flex items-center justify-center">
            <svg className="h-full w-full rotate-[-90deg]">
              <circle
                cx="48" cy="48" r="40"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              <circle
                cx="48" cy="48" r="40"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${data.score * 2.51} 251`}
                className={getStatusColor(data.status)}
              />
            </svg>
            <span className="absolute text-2xl font-black">{data.score}</span>
          </div>
          <div>
            <p className="text-lg font-bold">{data.summary}</p>
            <p className="text-xs text-muted-foreground mt-1">인공지능이 분석한 현재 자산 배분 및 종목 신뢰도 통합 점수</p>
          </div>
        </div>

        {/* 부문별 진단 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.details.map((d: any, i: number) => (
            <div key={i} className="bg-muted/20 p-4 rounded-2xl border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">{d.category}</span>
                <span className="text-xs font-bold text-foreground">{d.score}점</span>
              </div>
              <Progress value={d.score} className={`h-1.5 ${getScoreColor(d.score)}`} />
              <p className="text-[11px] text-muted-foreground leading-relaxed">{d.content}</p>
            </div>
          ))}
        </div>

        {/* 개선 가이드 */}
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20 space-y-3">
          <h5 className="text-xs font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
            <CheckCircle2 className="h-4 w-4" />
            건강한 포트폴리오를 위한 처방전
          </h5>
          <ul className="space-y-2">
            {data.actions.map((a: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
