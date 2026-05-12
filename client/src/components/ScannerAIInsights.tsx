import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Zap, RefreshCw, BarChart2, Quote, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

export default function ScannerAIInsights({
  market,
}: {
  market: "us" | "kr" | "all";
}) {
  const { data, isLoading, isFetching, refetch } =
    trpc.scanner.aiInsights.useQuery(
      { market },
      {
        staleTime: 60 * 60 * 1000,
        retry: 1,
        enabled: true,
      }
    );

  if (isLoading) {
    return (
      <Card className="glass-card border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
            AI 마켓 인사이트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-emerald-500/30 overflow-hidden relative group shadow-lg shadow-emerald-500/5">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500" />

      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          오늘의 AI 마켓 리포트
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-emerald-400 transition-colors"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>

      <CardContent>
        {data ? (
          <div className="relative">
            <Quote className="absolute -top-1 -left-2 h-8 w-8 text-emerald-500/10 rotate-180" />
            <div
              className="text-sm text-foreground/90 leading-relaxed prose prose-invert prose-sm max-w-none 
              prose-p:my-2 prose-strong:text-emerald-400 prose-ul:my-2 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:font-bold prose-h3:text-foreground"
            >
              <ReactMarkdown>{data.insights}</ReactMarkdown>
            </div>

            <div className="mt-6 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <BarChart2 className="h-3 w-3" />
                <span>
                  현재 스캔된 {market.toUpperCase()} 시장 데이터를 기반으로 함
                </span>
              </div>
              {data.analyzedAt && (
                <span>
                  분석 시각: {new Date(data.analyzedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              분석 데이터를 생성할 수 없습니다. 먼저 스캔을 실행해 보세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
