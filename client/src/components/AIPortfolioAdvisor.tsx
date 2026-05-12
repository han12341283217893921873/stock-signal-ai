import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, AlertCircle, Quote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

export default function AIPortfolioAdvisor() {
  const { data, isLoading, isFetching, isError, refetch } =
    trpc.portfolio.aiAdvice.useQuery(undefined, {
      staleTime: 30 * 60 * 1000, // 30분 캐시
      retry: 1,
    });

  if (isLoading) {
    return (
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            AI 포트폴리오 진단
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

  if (isError) {
    return (
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            AI 포트폴리오 진단
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-xs text-muted-foreground">
            AI 진단 중 오류가 발생했습니다
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs h-7"
          >
            <RefreshCw
              className={`h-3 w-3 mr-1.5 ${isFetching ? "animate-spin" : ""}`}
            />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-primary/30 overflow-hidden relative group">
      {/* Background glow effect */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />

      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          AI 포트폴리오 진단
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
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
            <Quote className="absolute -top-1 -left-2 h-8 w-8 text-primary/10 rotate-180" />
            <div className="text-sm text-foreground/90 leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-2 prose-strong:text-primary prose-ul:my-2">
              <ReactMarkdown>{data.advice}</ReactMarkdown>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>AI의 제안은 투자 참고용입니다.</span>
              </div>
              {data.analyzedAt && (
                <span>
                  진단 시각: {new Date(data.analyzedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              분석 데이터를 가져올 수 없습니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
