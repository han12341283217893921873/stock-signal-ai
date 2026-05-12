import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useMarketStream } from "@/hooks/useMarketStream";
import TradingChart from "@/components/TradingChart";
import MultiAICrossCheck from "@/components/MultiAICrossCheck";
import TechnicalReport from "@/components/TechnicalReport";

export default function StockSidePeek({
  ticker,
  open,
  onOpenChange,
}: {
  ticker: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const safeTicker = ticker ?? "";

  const { data: summary, isLoading } = trpc.stock.summary.useQuery(
    { ticker: safeTicker },
    { enabled: !!safeTicker, staleTime: 5000 }
  );

  const { data: candles } = trpc.stock.history.useQuery(
    { ticker: safeTicker, period: "6mo" },
    { enabled: !!safeTicker }
  );

  const realtimePrices = useMarketStream(safeTicker ? [safeTicker] : []);
  const realtimeData = realtimePrices[safeTicker];
  const price = realtimeData?.price ?? summary?.price;
  
  const getGradeBg = (grade?: string) => {
    switch (grade) {
      case "strong_buy": return "bg-emerald-500/20 text-emerald-400";
      case "buy": return "bg-green-500/20 text-green-400";
      case "sell": return "bg-orange-500/20 text-orange-400";
      case "strong_sell": return "bg-red-500/20 text-red-400";
      default: return "bg-yellow-500/20 text-yellow-400";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[95vw] sm:max-w-2xl lg:max-w-4xl overflow-y-auto bg-background/95 backdrop-blur-xl border-l border-border/50 p-0 z-[100]">
        {!ticker ? null : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b border-border/40 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <SheetTitle className="text-3xl font-black font-mono tracking-tighter">
                      {ticker}
                    </SheetTitle>
                    <Badge variant="outline" className={`${getGradeBg(summary?.signal.grade)} font-bold text-xs px-2 uppercase border-none`}>
                      {summary?.signal.gradeLabel ?? summary?.signal.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {summary?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black font-mono tracking-tighter">
                    {summary?.currency === "KRW" ? "₩" : "$"}
                    {summary?.currency === "KRW"
                      ? price?.toLocaleString("ko-KR")
                      : price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-primary gap-1 font-bold mt-1"
                    onClick={() => {
                      onOpenChange(false);
                      setLocation(`/stock/${ticker}`);
                    }}
                  >
                    전체 심층 분석 보기 <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </SheetHeader>
            <div className="p-6 space-y-6">
              <div className="h-[400px] rounded-xl overflow-hidden border border-border/50 bg-background/50 relative">
                <Badge className="absolute top-3 left-3 z-10 bg-background/60 backdrop-blur-md border-none text-[10px]">LIVE CHART</Badge>
                {candles && <TradingChart data={candles} />}
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <TechnicalReport ticker={safeTicker} />
                <MultiAICrossCheck ticker={safeTicker} marketContext="AI 단기 모멘텀 분석 모드입니다." />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
