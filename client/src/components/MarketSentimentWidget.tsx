import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  MessageSquare,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function MarketSentimentWidget() {
  const {
    data: sentiment,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = trpc.news.marketSentiment.useQuery();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            실시간 시장 감성 분석
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-xs text-muted-foreground">
            AI 분석 중 오류가 발생했습니다
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

  if (!sentiment) return null;

  const getScoreColor = (score: number) => {
    if (score > 40) return "text-bull";
    if (score < -40) return "text-bear";
    return "text-primary";
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case "환희":
        return "bg-bull/10 text-bull border-bull/20";
      case "낙관":
        return "bg-bull/10 text-bull border-bull/20";
      case "공포":
        return "bg-bear/10 text-bear border-bear/20";
      case "신중":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          실시간 시장 감성 분석
        </CardTitle>
        <Badge
          variant="outline"
          className={`text-[10px] font-bold ${getLabelColor(sentiment.label)}`}
        >
          {sentiment.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <p className="text-2xl font-black font-mono tracking-tighter leading-none mb-1">
              <span className={getScoreColor(sentiment.score)}>
                {sentiment.score > 0 ? "+" : ""}
                {sentiment.score}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                / 100 pt
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
              {sentiment.summary}
            </p>
          </div>
          <div className="h-12 w-1.5 bg-muted rounded-full overflow-hidden flex flex-col justify-end">
            <div
              className={`w-full transition-all duration-1000 ${sentiment.score > 0 ? "bg-bull" : "bg-bear"}`}
              style={{ height: `${Math.abs(sentiment.score)}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-border/40">
          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-2 tracking-widest">
            Trending Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sentiment.keywords.map((kw: string) => (
              <Badge
                key={kw}
                variant="secondary"
                className="text-[10px] bg-background/50 hover:bg-primary/10 transition-colors cursor-default border-border/50"
              >
                # {kw}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
