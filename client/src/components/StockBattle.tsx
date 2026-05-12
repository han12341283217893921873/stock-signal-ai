import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sword, Trophy, AlertCircle, Loader2, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StockBattle() {
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const compareMutation = trpc.ai.compareStocks.useMutation();

  const handleBattle = () => {
    if (!t1 || !t2) return;
    compareMutation.mutate({ ticker1: t1.toUpperCase(), ticker2: t2.toUpperCase() });
  };

  const data = compareMutation.data;
  const isLoading = compareMutation.isPending;

  return (
    <Card className="glass-card premium-border overflow-hidden bg-primary/5">
      <CardHeader className="pb-3 border-b border-primary/10">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Sword className="h-4 w-4 text-primary" />
          AI 종목 배틀 (Winner Takes All)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        <div className="flex items-center gap-3">
          <Input 
            placeholder="종목 1 (예: TSLA)" 
            value={t1} 
            onChange={(e) => setT1(e.target.value)}
            className="h-9 bg-background/50 border-primary/20 focus:ring-primary/50 text-xs text-center font-bold"
          />
          <div className="text-primary font-black italic">VS</div>
          <Input 
            placeholder="종목 2 (예: NVDA)" 
            value={t2} 
            onChange={(e) => setT2(e.target.value)}
            className="h-9 bg-background/50 border-primary/20 focus:ring-primary/50 text-xs text-center font-bold"
          />
          <Button 
            onClick={handleBattle} 
            disabled={isLoading || !t1 || !t2}
            size="sm"
            className="bg-primary hover:bg-primary/80 shrink-0 h-9"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "배틀 시작"}
          </Button>
        </div>

        {data && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            {/* 승자 발표 */}
            <div className="flex flex-col items-center py-4 bg-gradient-to-b from-primary/10 to-transparent rounded-2xl border border-primary/20">
              <Trophy className={`h-12 w-12 mb-2 ${data.winner === "DRAW" ? "text-muted-foreground" : "text-yellow-400 animate-bounce"}`} />
              <h4 className="text-xl font-black text-foreground">
                {data.winner === "DRAW" ? "무승부!" : `${data.winner} 승리!`}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 text-center px-4">
                {data.verdict}
              </p>
            </div>

            {/* 비교 상세 */}
            <div className="space-y-2">
              {data.comparison.map((c: any, i: number) => (
                <div key={i} className="grid grid-cols-7 gap-2 items-center bg-background/30 p-2.5 rounded-xl border border-border/50">
                  <div className={`col-span-3 text-[10px] p-2 rounded-lg leading-tight ${c.better === 1 ? "bg-primary/10 text-primary font-bold border border-primary/20" : "text-muted-foreground"}`}>
                    {c.s1}
                  </div>
                  <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{c.category}</span>
                    <Scale className="h-3 w-3 text-muted-foreground/30" />
                  </div>
                  <div className={`col-span-3 text-[10px] p-2 rounded-lg leading-tight text-right ${c.better === 2 ? "bg-primary/10 text-primary font-bold border border-primary/20" : "text-muted-foreground"}`}>
                    {c.s2}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex flex-col items-center justify-center py-10 opacity-30">
            <Sword className="h-12 w-12 mb-3" />
            <p className="text-xs text-center">비교하고 싶은 두 종목의 티커를 입력하고<br/>AI 심판의 판정을 확인해보세요.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
