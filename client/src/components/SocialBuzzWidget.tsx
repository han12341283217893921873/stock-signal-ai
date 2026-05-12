import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Hash, TrendingUp, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SocialBuzzWidgetProps {
  ticker: string;
}

export default function SocialBuzzWidget({ ticker }: SocialBuzzWidgetProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const buzzMutation = trpc.ai.socialSentiment.useMutation();

  const handleStart = () => {
    setHasStarted(true);
    buzzMutation.mutate({ ticker });
  };

  if (!hasStarted) {
    return (
      <Card className="glass-card border-violet-500/20 bg-violet-500/5">
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
          <MessageSquare className="h-8 w-8 text-violet-400" />
          <div>
            <h4 className="text-sm font-bold">소셜 센티먼트 스캔</h4>
            <p className="text-[10px] text-muted-foreground mt-1">
              X(Twitter), Reddit 등 소셜 미디어의 뜨거움을 측정합니다.
            </p>
          </div>
          <Button
            onClick={handleStart}
            size="sm"
            variant="outline"
            className="border-violet-500/40 hover:bg-violet-500/10"
          >
            실시간 스캔 시작
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isLoading = buzzMutation.isPending;
  const data = buzzMutation.data;

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!data) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Hash className="h-4 w-4 text-violet-400" />
          소셜 버즈 (Social Buzz)
        </CardTitle>
        <Badge
          variant="outline"
          className={`${
            data.sentiment === "Positive"
              ? "text-bull border-bull/20 bg-bull/5"
              : data.sentiment === "Negative"
                ? "text-bear border-bear/20 bg-bear/5"
                : "text-muted-foreground border-border"
          }`}
        >
          {data.sentiment}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            Buzz Intensity
          </span>
          <span className="text-xs font-mono font-bold text-violet-400">
            {data.buzzScore}/100
          </span>
        </div>
        <Progress value={data.buzzScore} className="h-1.5" />

        <p className="text-xs font-medium leading-snug bg-muted/30 p-2 rounded-lg border border-border/40">
          "{data.summary}"
        </p>

        <div className="pt-2">
          <div className="flex flex-wrap gap-1.5">
            {data.trendingKeywords.map((kw: string, i: number) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[9px] bg-violet-500/5 text-violet-300 border-violet-500/10"
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
