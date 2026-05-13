import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Search,
  X,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  Loader2,
  Wallet,
  Target,
  Tags,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useMarketStream } from "@/hooks/useMarketStream";
import { useNewsAlerts } from "@/hooks/useNewsAlerts";
import AddToPortfolioButton from "@/components/AddToPortfolioButton";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { TopMoversWidget } from "@/components/TopMoversWidget";
import EconomicCalendar from "@/components/EconomicCalendar";
import FearGreedGauge from "@/components/FearGreedGauge";
import SectorRotation from "@/components/SectorRotation";
import ChatAssistant from "@/components/ChatAssistant";
import MarketSentimentWidget from "@/components/MarketSentimentWidget";
import SectorHeatmap from "@/components/SectorHeatmap";
import MacroPulseDashboard from "@/components/MacroPulseDashboard";
import GlobalMarketMap from "@/components/GlobalMarketMap";
import DailyBriefingBanner from "@/components/DailyBriefingBanner";
import MarketCountdown from "@/components/MarketCountdown";
import DailyTopPicksWidget from "@/components/DailyTopPicksWidget";
import AIExecutiveSummary from "@/components/AIExecutiveSummary";
import SentimentHeatmap from "@/components/SentimentHeatmap";
import StockBattle from "@/components/StockBattle";
import { formatPrice, isKoreanTicker } from "@/lib/currency";
import StockSidePeek from "@/components/StockSidePeek";

export default function DashboardHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 뉴스 속보 토스트 알림 활성화
  useNewsAlerts();

  // Watchlist
  const { data: watchlistData, isLoading: watchlistLoading } =
    trpc.watchlist.list.useQuery(undefined, { enabled: !!user });

  const tickers = useMemo(
    () => (watchlistData || []).map(w => w.ticker),
    [watchlistData]
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (watchlistData || []).forEach(w => {
      if (w.tag) tags.add(w.tag);
    });
    return Array.from(tags);
  }, [watchlistData]);

  // Batch summary for watchlist tickers - 장중 20초, 장외 5분 폴링
  const {
    data: summaries,
    isLoading: summariesLoading,
    refetch: refetchSummaries,
    dataUpdatedAt,
  } = trpc.stock.batchSummary.useQuery(
    { tickers },
    {
      enabled: tickers.length > 0,
      refetchInterval: 60 * 1000,
      staleTime: 30 * 1000,
    }
  );

  // 장 상태 조회
  const { data: marketStatus } = trpc.stock.marketStatus.useQuery(undefined, {
    refetchInterval: 60 * 1000, // 1분마다 갱신
  });

  // 워치리스트 종목을 서버 프리페치에 등록
  const registerPrefetch = trpc.watchlist.registerPrefetch.useMutation();
  useEffect(() => {
    if (tickers.length > 0) {
      registerPrefetch.mutate({ tickers });
    }
  }, [tickers.join(",")]);

  // 마지막 갱신 시간 표시용
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState("방금 전");
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const update = () => {
      const secs = Math.round((Date.now() - dataUpdatedAt) / 1000);
      if (secs < 5) setLastUpdatedText("방금 전");
      else if (secs < 60) setLastUpdatedText(`${secs}초 전`);
      else setLastUpdatedText(`${Math.round(secs / 60)}분 전`);
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const realtimePrices = useMarketStream(tickers);

  const displaySummaries = useMemo(() => {
    if (!summaries) return undefined;
    return summaries.map(s => {
      const rt = realtimePrices[s.ticker];
      if (rt) {
        const p = rt.price;
        const prevClose = s.price / (1 + s.changePercent / 100);
        const cp = prevClose > 0 ? ((p - prevClose) / prevClose) * 100 : 0;
        return { ...s, price: p, changePercent: cp, rtDirection: rt.direction };
      }
      return { ...s, rtDirection: undefined };
    });
  }, [summaries, realtimePrices]);

  // 가격 변동 플래시 애니메이션 추적
  const prevPricesRef = useRef<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [flashMap, setFlashMap] = useState<
    Record<string, "up" | "down" | null>
  >({});
  useEffect(() => {
    if (!displaySummaries) return;
    const newFlash: Record<string, "up" | "down" | null> = {};
    displaySummaries.forEach(s => {
      const prev = prevPricesRef.current[s.ticker];
      if (prev !== undefined && prev !== s.price) {
        newFlash[s.ticker] = s.price > prev ? "up" : "down";
      }
      prevPricesRef.current[s.ticker] = s.price;
    });
    if (Object.keys(newFlash).length > 0) {
      setFlashMap(newFlash);
      setTimeout(() => setFlashMap({}), 800);
    }
  }, [displaySummaries]);

  // Mutations
  const utils = trpc.useUtils();
  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      utils.watchlist.list.invalidate();
      toast.success("관심 종목에 추가되었습니다");
    },
  });
  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      utils.watchlist.list.invalidate();
      toast.success("관심 종목에서 제거되었습니다");
    },
  });
  const setTagMutation = trpc.watchlist.setTag.useMutation({
    onSuccess: () => utils.watchlist.list.invalidate(),
  });

  const getGradeBg = (grade?: string) => {
    switch (grade) {
      case "strong_buy":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "buy":
        return "bg-green-500/20 text-green-400 border-green-500/40";
      case "sell":
        return "bg-orange-500/20 text-orange-400 border-orange-500/40";
      case "strong_sell":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    }
  };
  const getGradeIcon = (grade?: string) => {
    switch (grade) {
      case "strong_buy":
        return <TrendingUp className="h-4 w-4" />;
      case "buy":
        return <TrendingUp className="h-4 w-4" />;
      case "sell":
        return <TrendingDown className="h-4 w-4" />;
      case "strong_sell":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };
  // 하위 호환성 유지
  const getSignalColor = (type: string) => {
    switch (type) {
      case "buy":
        return "text-bull";
      case "sell":
        return "text-bear";
      default:
        return "text-neutral-signal";
    }
  };
  const getSignalBg = (grade?: string) => getGradeBg(grade);

  return (
    <DashboardLayout>
      <StockSidePeek 
        ticker={selectedTicker} 
        open={!!selectedTicker} 
        onOpenChange={(open) => !open && setSelectedTicker(null)} 
      />

      <div className="space-y-12 pb-20">
        {/* HERO SECTION: Leading the user's eye */}
        <section className="relative">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
              시장 흐름 파악하기
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              AI가 분석한 오늘의 핵심 시장 정보와 인사이트
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <AIExecutiveSummary tickers={tickers} />
              <DailyBriefingBanner />
              <StockBattle />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <MarketCountdown />
              <MarketSentimentWidget />
              <FearGreedGauge />
            </div>
          </div>
        </section>

        {/* ACTIONABLE: Watchlist & Signals */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
                내 관심 종목 분석
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                등록된 종목의 실시간 AI 매매 시그널
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {marketStatus && (
                <span
                  className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                    marketStatus.isOpen
                      ? "bg-bull/10 text-bull border border-bull/25"
                      : "bg-muted/60 text-muted-foreground border border-border/50"
                  }`}
                >
                  {marketStatus.isOpen ? (
                    <span className="live-dot" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  )}
                  {marketStatus.label}
                </span>
              )}
              {displaySummaries && displaySummaries.length > 0 && (
                <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                  <Activity className="h-3 w-3 text-bull" />
                  {lastUpdatedText}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchSummaries()}
                className="gap-1.5 h-8 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                새로고침
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-search"))
                }
                className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/85 shadow-lg shadow-primary/20"
              >
                <Plus className="h-3.5 w-3.5" />
                종목 추가
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          {displaySummaries && displaySummaries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                {
                  label: "매수 신호",
                  value: displaySummaries.filter(s => s.signal.type === "buy").length,
                  icon: TrendingUp,
                  colorClass: "text-bull",
                  bgClass: "bg-bull/12",
                },
                {
                  label: "매도 신호",
                  value: displaySummaries.filter(s => s.signal.type === "sell").length,
                  icon: TrendingDown,
                  colorClass: "text-bear",
                  bgClass: "bg-bear/12",
                },
                {
                  label: "중립",
                  value: displaySummaries.filter(s => s.signal.type === "neutral").length,
                  icon: Minus,
                  colorClass: "text-neutral-signal",
                  bgClass: "bg-neutral-signal/12",
                },
              ].map(({ label, value, icon: Icon, colorClass, bgClass }) => (
                <div key={label} className="stat-card card-lift border border-border/40 bg-card/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                        {label}
                      </p>
                      <p className={`text-3xl font-black mt-1.5 ${colorClass}`}>
                        {value}
                      </p>
                    </div>
                    <div className={`h-12 w-12 rounded-xl ${bgClass} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${colorClass}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tag Filter Chips */}
          {allTags.length > 0 && displaySummaries && displaySummaries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Tags className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                  activeTag === null
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
                onClick={() => setActiveTag(null)}
              >
                전체
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                    activeTag === tag
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Watchlist Cards */}
          {watchlistLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="glass-card">
                  <CardContent className="pt-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tickers.length > 0 && (!displaySummaries || summariesLoading) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tickers.map(t => (
                <Card key={t} className="glass-card">
                  <CardContent className="pt-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <Skeleton className="h-8 w-32 mb-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displaySummaries && displaySummaries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displaySummaries
                .filter(stock => {
                  if (!activeTag) return true;
                  const wItem = watchlistData?.find(w => w.ticker === stock.ticker);
                  return wItem?.tag === activeTag;
                })
                .map(stock => (
                  <Card
                    key={stock.ticker}
                    className={`glass-card hover:border-primary/40 transition-all cursor-pointer group shadow-sm hover:shadow-md ${
                      flashMap[stock.ticker] === "up"
                        ? "ring-1 ring-green-500/60 bg-green-500/5"
                        : flashMap[stock.ticker] === "down"
                          ? "ring-1 ring-red-500/60 bg-red-500/5"
                          : ""
                    }`}
                    onClick={() => setSelectedTicker(stock.ticker)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <CardTitle className="text-base font-mono truncate">
                            {stock.ticker}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold shrink-0 border-none px-2 ${getGradeBg(stock.signal.grade)}`}
                          >
                            {getGradeIcon(stock.signal.grade)}
                            <span className="ml-1 truncate max-w-[60px]">
                              {stock.signal.gradeLabel ?? stock.signal.type}
                            </span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AddToPortfolioButton
                            ticker={stock.ticker}
                            name={stock.name}
                            currentPrice={stock.price}
                            currency={stock.currency}
                            size="sm"
                            variant="ghost"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            onClick={e => {
                              e.stopPropagation();
                              removeMutation.mutate({ ticker: stock.ticker });
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0 mt-1">
                        <p className="text-xs text-muted-foreground font-medium truncate flex-1 min-w-0">
                          {stock.name}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <p className="text-2xl font-black font-mono tracking-tighter">
                            {stock.currencySymbol || "$"}
                            {stock.currency === "KRW"
                              ? stock.price.toLocaleString("ko-KR")
                              : stock.price.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                          </p>
                          <div
                            className={`flex items-center gap-1 text-sm font-bold ${stock.changePercent >= 0 ? "text-bull" : "text-bear"}`}
                          >
                            {stock.changePercent >= 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            <span className="font-mono">
                              {stock.changePercent >= 0 ? "+" : ""}
                              {stock.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">
                            투자 등급
                          </p>
                          <div className="flex flex-col items-end gap-0.5">
                            <p className={`text-sm font-black ${getGradeBg(stock.signal.grade).split(" ")[1]}`}>
                              {stock.signal.gradeLabel ?? stock.signal.type}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="glass-card border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-black mb-2">첫 관심 종목을 추가해보세요</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                  AI가 종목을 24시간 모니터링하여 최적의 매수/매도 타이밍을 알려드립니다.
                </p>
                <Button
                  size="lg"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-search"))}
                  className="gap-2 font-bold shadow-lg shadow-primary/20"
                >
                  <Search className="h-4 w-4" />
                  종목 검색하기
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* QUICK STATS: Portfolio & Signal Performance */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PortfolioMiniWidget />
          <SignalPerformanceMiniWidget />
        </section>

        {/* DISCOVERY: AI Top Picks & Macro */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex flex-col gap-1 mb-2">
              <h2 className="text-2xl font-black tracking-tight text-indigo-400">
                AI 추천 포트폴리오
              </h2>
              <p className="text-sm text-muted-foreground font-medium">단기 모멘텀이 돋보이는 AI 발굴 종목</p>
            </div>
            <DailyTopPicksWidget />
          </div>
          <div className="lg:col-span-6 space-y-6">
            <div className="flex flex-col gap-1 mb-2">
              <h2 className="text-2xl font-black tracking-tight text-blue-400">
                매크로 지표 보드
              </h2>
              <p className="text-sm text-muted-foreground font-medium">글로벌 자금 흐름과 섹터 강세 확인</p>
            </div>
            <MacroPulseDashboard />
            <SectorHeatmap />
          </div>
        </section>
        
        {/* Floating Chat Assistant */}
        <ChatAssistant />
      </div>
    </DashboardLayout>
  );
}

function SignalPerformanceMiniWidget() {
  const { data: stats } = trpc.signalPerformance.stats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  if (!stats || stats.total === 0) return null;

  const isPositive = stats.avgReturn >= 0;

  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">신호 성과</span>
            <Badge variant="outline" className="text-[10px]">
              {stats.total}건
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">승률</p>
              <p className="text-sm font-bold font-mono text-green-500">
                {stats.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">평균 수익</p>
              <p
                className={`text-sm font-bold font-mono ${isPositive ? "text-green-500" : "text-red-500"}`}
              >
                {isPositive ? "+" : ""}
                {stats.avgReturn.toFixed(2)}%
              </p>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                isPositive
                  ? "bg-green-500/10 text-green-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              {stats.wins}W / {stats.losses}L
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PortfolioMiniWidget() {
  const { data: portfolioData } = trpc.portfolio.list.useQuery();
  const positions = portfolioData?.positions ?? [];
  const [, setLocation] = useLocation();

  if (positions.length === 0) return null;

  const totalInvested = positions.reduce(
    (sum, p) => sum + Number(p.avgPrice) * Number(p.quantity),
    0
  );
  const totalValue = positions.reduce((sum, p) => sum + (p.totalValue ?? 0), 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isProfit = totalPnl >= 0;

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => setLocation("/portfolio")}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">내 포트폴리오</span>
            <Badge variant="outline" className="text-[10px]">
              {positions.length}종목
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">평가금액</p>
              {(() => {
                const krwVal = positions
                  .filter(p => isKoreanTicker(p.ticker))
                  .reduce((s, p) => s + (p.totalValue ?? 0), 0);
                const usdVal = positions
                  .filter(p => !isKoreanTicker(p.ticker))
                  .reduce((s, p) => s + (p.totalValue ?? 0), 0);
                const hasBoth = krwVal > 0 && usdVal > 0;
                return hasBoth ? (
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono">
                      $
                      {usdVal.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      ₩
                      {krwVal.toLocaleString("ko-KR", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-bold font-mono">
                    {krwVal > 0
                      ? `₩${krwVal.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`
                      : `$${usdVal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  </p>
                );
              })()}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">수익률</p>
              <p
                className={`text-sm font-bold font-mono ${isProfit ? "text-green-500" : "text-red-500"}`}
              >
                {isProfit ? "+" : ""}
                {totalPnlPct.toFixed(2)}%
              </p>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                isProfit
                  ? "bg-green-500/10 text-green-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              {isProfit ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {isProfit ? "+" : "-"}
              {formatPrice(Math.abs(totalPnl), undefined, {
                currency: positions.every(p => isKoreanTicker(p.ticker))
                  ? "KRW"
                  : "USD",
                decimals: 0,
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
