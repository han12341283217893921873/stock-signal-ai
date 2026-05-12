import { trpc } from "@/lib/trpc";
import { Brain, Sparkles, AlertCircle, Smile, Coffee, Wind } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AIExecutiveSummaryProps {
  tickers: string[];
}

export default function AIExecutiveSummary({ tickers }: AIExecutiveSummaryProps) {
  const { data: summary, isLoading } = trpc.ai.dashboardSummary.useQuery(
    { tickers },
    { 
      enabled: true, 
      staleTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false 
    }
  );

  if (isLoading) {
    return (
      <Card className="glass-card premium-border overflow-hidden bg-primary/5">
        <CardContent className="p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case "happy":
        return <Smile className="h-6 w-6 text-green-400" />;
      case "calm":
        return <Coffee className="h-6 w-6 text-blue-400" />;
      case "warn":
        return <AlertCircle className="h-6 w-6 text-orange-400" />;
      default:
        return <Wind className="h-6 w-6 text-primary" />;
    }
  };

  const getMoodBg = (mood: string) => {
    switch (mood) {
      case "happy":
        return "bg-green-500/10 border-green-500/20";
      case "calm":
        return "bg-blue-500/10 border-blue-500/20";
      case "warn":
        return "bg-orange-500/10 border-orange-500/20";
      default:
        return "bg-primary/10 border-primary/20";
    }
  };

  return (
    <Card className={`glass-card premium-border overflow-hidden transition-all duration-500 ${getMoodBg(summary.mood)}`}>
      <CardContent className="p-5 relative">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Brain className="h-24 w-24" />
        </div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${getMoodBg(summary.mood)}`}>
            {getMoodIcon(summary.mood)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                AI 가이드의 친절한 요약
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground leading-tight">
              {summary.simpleSummary}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
