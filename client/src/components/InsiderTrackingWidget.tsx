import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InsiderTrackingWidgetProps {
  ticker: string;
}

export default function InsiderTrackingWidget({
  ticker,
}: InsiderTrackingWidgetProps) {
  const { data: insider, isLoading } = trpc.stock.insiderTracking.useQuery({
    ticker,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!insider || insider.recent.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          내부자 매매 추적 (Smart Money)
        </CardTitle>
        <Badge
          className={`${
            insider.sentiment === "Bullish"
              ? "bg-bull/20 text-bull"
              : insider.sentiment === "Bearish"
                ? "bg-bear/20 text-bear"
                : "bg-muted text-muted-foreground"
          } border-none`}
        >
          {insider.sentiment}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              최근 20건 순매수
            </p>
            <p
              className={`text-sm font-black ${insider.netShares >= 0 ? "text-bull" : "text-bear"}`}
            >
              {insider.netShares.toLocaleString()} 주
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              데이터 소스
            </p>
            <p className="text-[11px] font-medium">SEC Form 4</p>
          </div>
        </div>

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
          {insider.recent.map((t: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
            >
              <div className="flex items-center gap-2">
                {t.transactionCode === "P" ? (
                  <ArrowUpRight className="h-3 w-3 text-bull shrink-0" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-bear shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold truncate">{t.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {t.share.toLocaleString()}주 · {t.transactionDate}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-background/50">
                {t.transactionCode === "P" ? "BUY" : "SELL"}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 pt-2 border-t border-border/40">
          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[9px] text-muted-foreground leading-snug">
            회사의 임원이나 대주주가 자신의 주식을 매매하는 것은 기업의 미래
            가치에 대한 가장 강력한 직접적 신호 중 하나입니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
