import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";
import { useMarketStream } from "@/hooks/useMarketStream";
import type { TopMover } from "@shared/types";

interface TopMoversWidgetProps {
  isCollapsed: boolean;
  onNavigate: (ticker: string) => void;
}

export function TopMoversWidget({
  isCollapsed,
  onNavigate,
}: TopMoversWidgetProps) {
  const [activeTab, setActiveTab] = useState<"gainers" | "losers">("gainers");
  const [market, setMarket] = useState<"US" | "KR">("US");

  const {
    data: topMovers,
    isLoading,
    isError,
  } = trpc.stock.topMovers.useQuery(
    { market },
    {
      refetchInterval: 15 * 1000,
      staleTime: 10 * 1000,
      retry: 3,
      retryDelay: 2000,
    }
  );

  // Client-side clock for "last updated" display
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("-");
  useEffect(() => {
    if (!topMovers?.timestamp) return;
    const update = () => {
      const secs = Math.round(
        (Date.now() - new Date(topMovers.timestamp!).getTime()) / 1000
      );
      if (secs < 5) setLastUpdatedText("방금 전");
      else if (secs < 60) setLastUpdatedText(`${secs}초 전 갱신`);
      else setLastUpdatedText(`${Math.round(secs / 60)}분 전 갱신`);
    };
    update();
    const id = setInterval(update, 3000);
    return () => clearInterval(id);
  }, [topMovers?.timestamp]);

  const items = topMovers
    ? activeTab === "gainers"
      ? topMovers.gainers
      : topMovers.losers
    : [];
  const isGainers = activeTab === "gainers";
  const isKR = market === "KR";

  const streamTickers = items.map((i: TopMover) => i.ticker);
  const realtimePrices = useMarketStream(streamTickers);

  if (isCollapsed) return null;

  if (isLoading && !topMovers) {
    return (
      <div className="px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-1 mb-2">
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            실시간 순위
          </span>
        </div>
        <div className="space-y-2 py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 py-0.5"
            >
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded bg-muted/60 animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />
              </div>
              <div className="h-3 w-10 rounded bg-muted/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !topMovers) {
    return (
      <div className="px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-1 mb-2">
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            실시간 순위
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground py-2">
          데이터를 불러올 수 없습니다
        </div>
      </div>
    );
  }

  const displayItems = items.map((item: TopMover) => {
    const rt = realtimePrices[item.ticker];
    if (rt) {
      const prevClose = item.price - item.change;
      const c = rt.price - prevClose;
      const cp = prevClose > 0 ? (c / prevClose) * 100 : 0;
      return {
        ...item,
        price: rt.price,
        change: c,
        changePercent: cp,
        direction: rt.direction,
      };
    }
    return { ...item, direction: "same" as const };
  });

  return (
    <div className="px-3 py-2 border-b border-border/50">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {isGainers ? (
            <TrendingUp className="h-3 w-3 text-bull" />
          ) : (
            <TrendingDown className="h-3 w-3 text-bear" />
          )}
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
            {isGainers ? "상승 종목" : "하락 종목"}
          </span>
          <span className="live-dot ml-1" title="실시간 갱신 중" />
        </div>
        {isLoading && (
          <span className="text-[9px] text-muted-foreground">갱신 중...</span>
        )}
      </div>

      {/* 시장 탭 */}
      <div className="flex gap-1 mb-1.5">
        {(["US", "KR"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              market === m
                ? "bg-primary/20 text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            {m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
          </button>
        ))}
      </div>

      {/* 상승/하락 탭 */}
      <div className="flex gap-1 mb-2">
        {(["gainers", "losers"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              activeTab === tab
                ? tab === "gainers"
                  ? "bg-bull/20 text-bull font-medium"
                  : "bg-bear/20 text-bear font-medium"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            {tab === "gainers" ? "상승" : "하락"}
          </button>
        ))}
      </div>

      {/* 순위 리스트 */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {displayItems.length === 0 ? (
          <div className="text-[10px] text-muted-foreground py-2 text-center">
            {isKR ? "한국 장 마감 중" : "데이터 없음"}
          </div>
        ) : (
          displayItems.map((item: TopMover & { direction?: string }) => {
            const isUp = item.direction === "up";
            const isDown = item.direction === "down";
            return (
              <button
                key={item.ticker}
                onClick={() => onNavigate(item.ticker)}
                className="w-full text-left p-1.5 rounded hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                      <Badge
                        variant="outline"
                        className="h-5 min-w-[20px] px-1 text-[10px] font-bold shrink-0 flex items-center justify-center"
                      >
                        {item.rank}
                      </Badge>
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono font-semibold text-foreground truncate group-hover:text-primary transition-colors block">
                        {isKR ? item.name : item.ticker}
                      </span>
                      {isKR && (
                        <span className="text-[9px] text-muted-foreground font-mono truncate block opacity-80">
                          {item.ticker.replace(".KS", "").replace(".KQ", "")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold shrink-0 ${
                      item.changePercent >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {item.changePercent >= 0 ? "+" : ""}
                    {item.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5 ml-6">
                  <span
                    className={`text-[10px] font-mono transition-colors ${
                      isUp
                        ? "text-bull"
                        : isDown
                          ? "text-bear"
                          : "text-muted-foreground"
                    }`}
                  >
                    {isKR
                      ? `₩${item.price.toLocaleString("ko-KR")}`
                      : `$${item.price.toFixed(2)}`}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {item.change >= 0 ? "+" : ""}
                    {isKR
                      ? item.change.toLocaleString("ko-KR")
                      : item.change.toFixed(2)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="text-[10px] text-muted-foreground/60 mt-2 pt-1 border-t border-border/30">
        {lastUpdatedText}
      </div>
    </div>
  );
}
