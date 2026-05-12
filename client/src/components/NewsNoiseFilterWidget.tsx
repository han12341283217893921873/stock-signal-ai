import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Info, AlertCircle, FilterX, Flame } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NewsNoiseFilterWidgetProps {
  ticker: string;
}

export default function NewsNoiseFilterWidget({
  ticker,
}: NewsNoiseFilterWidgetProps) {
  const [showNoise, setShowNoise] = useState(false);
  const { data: sentiment, isLoading } = trpc.news.sentiment.useQuery({
    ticker,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!sentiment || !sentiment.headlines) return null;

  const allNews = sentiment.headlines;
  const filteredNews = allNews.filter((n: any) => !n.isNoise);
  const noiseNews = allNews.filter((n: any) => n.isNoise);

  const displayNews = showNoise ? allNews : filteredNews;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          AI 필터링 뉴스
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {noiseNews.length}개 소음 제거됨
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={() => setShowNoise(!showNoise)}
          >
            {showNoise ? "필터 적용" : "소음 포함 보기"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayNews.length === 0 && (
          <div className="text-center py-8">
            <FilterX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              영향력 있는 뉴스가 없습니다.
            </p>
          </div>
        )}
        {displayNews.map((news: any, i: number) => (
          <div
            key={i}
            className={`p-3 rounded-lg border transition-all ${
              news.isNoise
                ? "opacity-40 bg-muted/20 border-dashed"
                : "bg-background/40 border-border/50 hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant="outline"
                className={`text-[9px] h-4 px-1 ${
                  news.impact >= 7
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : news.impact >= 4
                      ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}
              >
                IMPACT {news.impact}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono">
                {news.source} ·{" "}
                {new Date(news.publishedAt).toLocaleDateString()}
              </span>
              {news.impact >= 8 && (
                <Flame className="h-3 w-3 text-red-500 animate-pulse" />
              )}
            </div>
            <p className="text-xs font-bold leading-snug line-clamp-2">
              {news.title}
            </p>
            {news.impactReason && !news.isNoise && (
              <div className="mt-2 flex gap-1.5 items-start">
                <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {news.impactReason}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
