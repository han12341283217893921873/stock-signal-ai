import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Newspaper,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Shield,
  Zap,
  Eye,
} from "lucide-react";

export default function DailyBriefingBanner() {
  const [expanded, setExpanded] = useState(false);
  const {
    data: briefing,
    isLoading,
    isError,
  } = trpc.macro.dailyBriefing.useQuery(undefined, {
    staleTime: 4 * 60 * 60 * 1000, // 4시간
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/20 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>
    );
  }

  if (isError || !briefing) return null;

  const sentimentIcon =
    briefing.sentiment === "bullish" ? (
      <TrendingUp className="h-4 w-4 text-bull" />
    ) : briefing.sentiment === "bearish" ? (
      <TrendingDown className="h-4 w-4 text-bear" />
    ) : (
      <Minus className="h-4 w-4 text-yellow-400" />
    );

  const riskColor =
    briefing.riskLevel === "high"
      ? "text-red-400 border-red-400/30 bg-red-400/10"
      : briefing.riskLevel === "medium"
        ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
        : "text-green-400 border-green-400/30 bg-green-400/10";

  const riskIcon =
    briefing.riskLevel === "high" ? (
      <AlertTriangle className="h-3 w-3" />
    ) : briefing.riskLevel === "medium" ? (
      <Zap className="h-3 w-3" />
    ) : (
      <Shield className="h-3 w-3" />
    );

  const riskLabel =
    briefing.riskLevel === "high"
      ? "위험"
      : briefing.riskLevel === "medium"
        ? "보통"
        : "안전";

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/8 to-transparent overflow-hidden">
      {/* 헤더 행 */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Newspaper className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              📋 오늘의 AI 브리핑
            </span>
            <span className="text-[11px] text-muted-foreground">
              {briefing.today}
            </span>
          </div>
          <p className="text-sm font-semibold mt-0.5 flex items-center gap-1.5">
            {sentimentIcon}
            {briefing.headline}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-[11px] font-medium gap-1 py-1 px-2.5 ${riskColor}`}>
            {riskIcon} 리스크 {riskLabel}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* 상세 정보 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-primary/10 pt-3">
          {/* AI 요약 */}
          <p className="text-sm text-foreground/85 leading-relaxed">
            {briefing.summary}
          </p>

          {/* 핵심 포인트 */}
          {briefing.keyPoints?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                핵심 포인트
              </p>
              <ul className="space-y-1">
                {briefing.keyPoints.map((point: string, i: number) => (
                  <li
                    key={i}
                    className="text-xs text-foreground/80 flex items-start gap-2"
                  >
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 주목 티커 */}
          {briefing.watchTickers?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                <Eye className="h-3 w-3 inline mr-1" />
                오늘 주목할 종목
              </p>
              <div className="flex flex-wrap gap-1.5">
                {briefing.watchTickers.map((t: string) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="font-mono text-xs border border-primary/20 bg-primary/5 text-primary"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/60 text-right">
            AI 생성 시각:{" "}
            {briefing.generatedAt
              ? new Date(briefing.generatedAt).toLocaleTimeString("ko-KR")
              : "-"}
          </p>
        </div>
      )}
    </div>
  );
}
