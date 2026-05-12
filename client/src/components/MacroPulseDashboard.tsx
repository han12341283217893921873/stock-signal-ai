import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Gem,
  Flame,
  Bitcoin,
  Landmark,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function MacroPulseDashboard() {
  const {
    data: pulse,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = trpc.macro.pulse.useQuery();

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  if (isError) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            글로벌 매크로 펼스 (AI)
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center space-y-3">
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

  const pulseData = pulse as {
    indicators: Record<
      string,
      { key: string; symbol: string; price: number; change: number }
    >;
    aiInsight: { riskScore: number; summary: string; sentiment: string };
    timestamp: string;
  } | null;

  if (!pulseData || !pulseData.indicators) return null;

  const { indicators, aiInsight } = pulseData;

  const getRiskColor = (score: number) => {
    if (score > 70) return "text-bear";
    if (score > 40) return "text-yellow-400";
    return "text-bull";
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return (
          <Badge className="bg-bull/20 text-bull border-bull/30">
            안전자산 선호
          </Badge>
        );
      case "bearish":
        return (
          <Badge className="bg-bear/20 text-bear border-bear/30">
            위험 회피
          </Badge>
        );
      default:
        return <Badge variant="outline">중립</Badge>;
    }
  };

  const IndicatorRow = ({ icon: Icon, label, data }: any) => (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-muted/50">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold font-mono">
          {data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
        <p
          className={`text-[10px] font-mono ${data.change >= 0 ? "text-bull" : "text-bear"}`}
        >
          {data.change >= 0 ? "+" : ""}
          {data.change.toFixed(2)}%
        </p>
      </div>
    </div>
  );

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          글로벌 매크로 펄스 (AI)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Risk Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              시장 리스크 지수
            </span>
            <span
              className={`text-lg font-black font-mono ${getRiskColor(aiInsight.riskScore)}`}
            >
              {aiInsight.riskScore}/100
            </span>
          </div>
          <Progress value={aiInsight.riskScore} className="h-1.5" />
        </div>

        {/* AI Insight */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold">AI 거시경제 전략</span>
            </div>
            {getSentimentBadge(aiInsight.sentiment)}
          </div>
          <p className="text-[12px] leading-relaxed italic text-foreground/90 font-medium">
            &quot;{aiInsight.summary}&quot;
          </p>
        </div>

        {/* Indicators Grid */}
        <div className="grid grid-cols-1 gap-1">
          <IndicatorRow
            icon={DollarSign}
            label="환율 (USD/KRW)"
            data={indicators.exchangeRate}
          />
          <IndicatorRow
            icon={Landmark}
            label="미국 10년물 금리"
            data={indicators.us10yYield}
          />
          <IndicatorRow icon={Gem} label="금 (Gold)" data={indicators.gold} />
          <IndicatorRow
            icon={Flame}
            label="원유 (Crude Oil)"
            data={indicators.crudeOil}
          />
          <IndicatorRow
            icon={Bitcoin}
            label="비트코인"
            data={indicators.bitcoin}
          />
        </div>

        <p className="text-[10px] text-center text-muted-foreground/60 pt-2 border-t border-border/30">
          {pulse &&
            (pulse as any).timestamp &&
            new Date((pulse as any).timestamp).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}
