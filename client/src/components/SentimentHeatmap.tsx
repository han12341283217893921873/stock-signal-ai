import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Zap, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SentimentHeatmap() {
  const { data: heatmap, isLoading } = trpc.macro.sentimentHeatmap.useQuery();

  if (isLoading) {
    return (
      <Card className="glass-card premium-border h-full">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">섹터별 감성 온도를 측정 중입니다...</p>
        </CardContent>
      </Card>
    );
  }

  if (!heatmap || heatmap.length === 0) return null;

  // 점수에 따른 색상 매핑
  const getColor = (value: number) => {
    if (value >= 75) return "bg-bull/20 text-bull border-bull/30";
    if (value >= 60) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (value >= 40) return "bg-muted text-muted-foreground border-border";
    if (value >= 25) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    return "bg-bear/20 text-bear border-bear/30";
  };

  const getHeatIcon = (value: number) => {
    if (value >= 60) return "🔥";
    if (value <= 40) return "❄️";
    return "☁️";
  };

  return (
    <Card className="glass-card premium-border overflow-hidden bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            섹터별 AI 투자 심리 온도계
          </div>
          <div className="flex items-center gap-1.5 opacity-50">
            <div className="h-2 w-2 rounded-full bg-bull" />
            <span className="text-[10px]">과열</span>
            <div className="h-2 w-2 rounded-full bg-bear ml-1" />
            <span className="text-[10px]">냉각</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {heatmap.map((s: any, i: number) => (
            <div key={i} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all hover:scale-[1.02] cursor-default ${getColor(s.value)}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black truncate max-w-[70px] uppercase tracking-tight">{s.name}</span>
                <span className="text-[12px]">{getHeatIcon(s.value)}</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex -space-x-1">
                  {s.topStocks.map((ticker: string, idx: number) => (
                    <div key={idx} className="w-5 h-5 rounded-md bg-background/50 border border-border/50 flex items-center justify-center text-[8px] font-bold">
                      {ticker.slice(0, 2)}
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <span className="text-sm font-black">{s.value}°</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-background/40 rounded-xl border border-border/50 flex items-start gap-2">
          <Info className="h-3 w-3 text-muted-foreground mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            단순 가격 등락이 아닌, 최근 AI 분석 리포트의 긍정적/부정적 의견 비중과 신호 강도를 결합하여 산출한 데이터입니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
