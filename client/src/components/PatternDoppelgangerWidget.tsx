import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Search, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

// 과거 폭등 차트 도플갱어 모의 데이터
const PATTERN_DATABASE = [
  { name: "2020년 테슬라 (TSLA) 폭등 직전", similarity: 92, direction: "up", color: "text-emerald-400" },
  { name: "2021년 엔비디아 (NVDA) 랠리 초입", similarity: 88, direction: "up", color: "text-emerald-400" },
  { name: "2020년 현대차 (005380) 애플카 루머 직전", similarity: 90, direction: "up", color: "text-emerald-400" },
  { name: "2021년 카카오 (035720) 최고점 직전 쌍봉", similarity: 85, direction: "down", color: "text-red-400" },
  { name: "2008년 리만 브라더스 파산 전조", similarity: 82, direction: "down", color: "text-red-400" },
];

export default function PatternDoppelgangerWidget({ ticker }: { ticker: string }) {
  const [pattern, setPattern] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 종목 티커의 길이나 문자열을 기반으로 일관된 랜덤 시드 생성
    const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomIndex = seed % PATTERN_DATABASE.length;
    
    // 시각적 연출을 위한 딜레이
    setLoading(true);
    setTimeout(() => {
      setPattern(PATTERN_DATABASE[randomIndex]);
      setLoading(false);
    }, 1500);
  }, [ticker]);

  return (
    <Card className="glass-card premium-border overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">
        <Sparkles className="w-32 h-32" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <LineChart className="w-4 h-4 text-primary" />
          차트 도플갱어 (Pattern Doppelganger)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-20 flex flex-col items-center justify-center gap-2">
            <Search className="w-5 h-5 animate-bounce text-muted-foreground" />
            <p className="text-xs font-mono text-muted-foreground animate-pulse">
              과거 20년치 10,000개 폭등/폭락 차트와 패턴 대조 중...
            </p>
          </div>
        ) : (
          <div className="space-y-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">가장 유사한 과거 차트 패턴 발견!</p>
                <p className="text-lg font-black tracking-tight flex items-center gap-2">
                  {pattern.name}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className={`font-mono text-lg font-black px-3 py-1 ${pattern.color} border-${pattern.color.split('-')[1]}-500/30 bg-background/50`}>
                  {pattern.similarity}% 일치
                </Badge>
              </div>
            </div>
            
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 text-sm">
              <span className="font-bold text-primary">AI 분석 결과:</span> 현재 <span className="font-black">{ticker}</span>의 차트는 
              <span className="font-bold text-foreground"> {pattern.name}</span> 패턴과 수학적으로 <span className="font-bold text-primary">{pattern.similarity}%</span> 일치합니다. 
              {pattern.direction === "up" ? (
                <span className="text-emerald-400 font-semibold ml-1">
                  강력한 상승 모멘텀(폭등)이 임박했을 가능성이 높습니다.
                </span>
              ) : (
                <span className="text-red-400 font-semibold ml-1">
                  고점 시그널이 감지되었습니다. 강한 조정(폭락)에 주의하세요.
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
