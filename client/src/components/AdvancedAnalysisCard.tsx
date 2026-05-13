import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CloudRain, 
  Sun, 
  Cloud, 
  AlertTriangle, 
  Zap, 
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  ShieldAlert
} from "lucide-react";

export default function AdvancedAnalysisCard({ ticker }: { ticker: string }) {
  const { data: analysis, isLoading } = trpc.advanced.analyze.useQuery({ ticker });

  if (isLoading) {
    return <div className="h-[400px] flex items-center justify-center">분석 엔진 가동 중...</div>;
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* 1. 시장 기상도 (매크로 방어) */}
      <Card className={`premium-border ${analysis.marketWeather.status === 'storm' ? 'bg-red-500/5' : 'bg-card'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            거시경제 방어막 (시장 환경)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                analysis.marketWeather.status === 'storm' ? 'bg-red-500/20 text-red-400' :
                analysis.marketWeather.status === 'cloudy' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {analysis.marketWeather.status === 'storm' ? <CloudRain /> : 
                 analysis.marketWeather.status === 'cloudy' ? <Cloud /> : <Sun />}
              </div>
              <div>
                <p className="font-black text-lg">
                {analysis.marketWeather.status === 'storm' ? '⛈️ 폭풍 장세' :
                 analysis.marketWeather.status === 'cloudy' ? '☁️ 흘림 주의' : '☀️ 맑음 호조'}
              </p>
                <p className="text-xs text-muted-foreground">{analysis.marketWeather.reason}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary">{analysis.marketWeather.score}점</p>
              <Badge variant="outline" className="text-[10px]">AI 시장 점수</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. 섹터 & 심리 레이더 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Zap className="w-3 h-3" /> 섹터 동향
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.sectorStatus ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">{analysis.sectorStatus.name}</span>
                  <Badge className={analysis.sectorStatus.isMeltdown ? 'bg-red-500' : 'bg-emerald-500'}>
                    {analysis.sectorStatus.change}%
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {analysis.sectorStatus.isMeltdown ? "⚠️ 섹터 동반 하락이 감지되었습니다. 개별 상승이 제한적일 수 있습니다." : "✅ 섹터 추세 양호"}
                </p>
              </div>
            ) : <p className="text-xs text-muted-foreground">섹터 데이터 분석 중...</p>}
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> 시장 심리 지수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold">심리 지수</span>
              <span className="text-xs font-mono font-bold text-primary">{analysis.speedMetric.sentimentScore} / 10</span>
            </div>
            <Progress value={(analysis.speedMetric.sentimentScore + 10) * 5} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-2 italic">"{analysis.speedMetric.summary}"</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. 최종 권고 및 헤지 솔루션 */}
      <Card className="border-primary/40 bg-primary/5 shadow-2xl shadow-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center shrink-0">
              <p className="text-xl font-black text-primary">{analysis.finalScore}</p>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black tracking-tight">{analysis.recommendation}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                기본 점수({analysis.baseScore})에 매크로 및 실시간 수급 가중치를 반영한 최종 결론입니다.
              </p>
            </div>
          </div>

          {analysis.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {analysis.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {analysis.hedgeSuggestions.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" /> 헤지 수단 제안 (리스크 관리)
              </p>
              {analysis.hedgeSuggestions.map(h => (
                <div key={h.ticker} className="p-3 rounded-xl bg-card border border-border/50 flex items-center justify-between group hover:border-primary/50 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm">{h.ticker}</span>
                      <span className="text-[10px] text-muted-foreground">{h.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{h.reason}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">추천 비중 {h.weight}%</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
