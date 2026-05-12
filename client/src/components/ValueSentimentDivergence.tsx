import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  Info
} from "lucide-react";
import { useLocation } from "wouter";

export default function ValueSentimentDivergence() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = trpc.divergence.list.useQuery({ 
    market: "us",
    limit: 10
  }, {
    refetchInterval: 60 * 1000 // 1분마다 갱신
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
        전략 데이터를 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier 1 - 강력 추천 (가치-심리 괴리 극대화) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <h3 className="font-bold text-lg">Tier 1: 역발상 매수 기회</h3>
            <Badge variant="secondary" className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20">
              강력 추천
            </Badge>
          </div>
          
          <div className="space-y-3">
            {items.filter(i => i.tier === 1).map(item => (
              <DivergenceCard key={item.ticker} item={item} onNavigate={setLocation} />
            ))}
            {items.filter(i => i.tier === 1).length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                현재 가격 괴리가 극심한 Tier 1 종목이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Tier 2 - 관심 종목 (고가치 우량주 지켜보기) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Tier 2: 추세 전환 대기</h3>
            <Badge variant="outline">관심 종목</Badge>
          </div>

          <div className="space-y-3">
            {items.filter(i => i.tier === 2).slice(0, 5).map(item => (
              <DivergenceCard key={item.ticker} item={item} onNavigate={setLocation} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DivergenceCard({ item, onNavigate }: { item: any, onNavigate: (p: string) => void }) {
  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 glass-card premium-border cursor-pointer"
      onClick={() => onNavigate(`/stock/${item.ticker}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${item.tier === 1 ? 'bg-yellow-400/10 text-yellow-500' : 'bg-primary/10 text-primary'}`}>
              {item.ticker.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-base">{item.ticker}</h4>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-tighter">
                  Score {item.divergenceScore}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <CheckCircle2 className="w-3 h-3" />
                  AI {item.fundamentalScore}pt
                </div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-black font-mono">
              {item.currencySymbol}{item.price.toLocaleString()}
            </div>
            <div className={`text-[10px] font-bold ${item.changePercent >= 0 ? 'text-bull' : 'text-bear'}`}>
              {item.changePercent >= 0 ? '▲' : '▼'} {Math.abs(item.changePercent).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/30 rounded-xl border border-border/50 group-hover:bg-muted/50 transition-colors">
          <div className="flex gap-2">
            <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">
              "{item.comment}"
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">RSI</p>
              <p className={`text-xs font-black font-mono ${item.rsi && item.rsi < 35 ? 'text-emerald-500' : 'text-foreground'}`}>
                {item.rsi?.toFixed(1) ?? 'N/A'}
              </p>
            </div>
            <div className="w-[1px] h-6 bg-border/50" />
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Bottom Bonus</p>
              <p className="text-xs font-black font-mono text-primary">
                +{item.technicalBonus}
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full group-hover:bg-primary group-hover:text-white transition-all">
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>

      {item.tier === 1 && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
          <div className="absolute top-[-8px] right-[-32px] w-[100px] h-[30px] bg-yellow-400 text-[10px] font-black flex items-center justify-center rotate-45 text-black shadow-lg">
            TOP PICK
          </div>
        </div>
      )}
    </Card>
  );
}
