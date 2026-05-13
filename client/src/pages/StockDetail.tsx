import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldAlert,
  Newspaper,
  Scan,
  ChevronUp,
  ChevronDown,
  Activity,
  StickyNote,
  Save,
  Trash2,
  Star,
  History,
  Clock,
  Calendar,
  Wallet,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

import { useMarketStream } from "@/hooks/useMarketStream";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useParams, useLocation } from "wouter";
import { Streamdown } from "streamdown";
import AddToPortfolioButton from "@/components/AddToPortfolioButton";
import TradingChart from "@/components/TradingChart";
import FundamentalSummary from "@/components/FundamentalSummary";
import MacroContext from "@/components/MacroContext";
import TechnicalReport from "@/components/TechnicalReport";
import AIChartAnalyst from "@/components/AIChartAnalyst";
import MultiAICrossCheck from "@/components/MultiAICrossCheck";
import AIDeepDive from "@/components/AIDeepDive";
import FinancialAnomalyWidget from "@/components/FinancialAnomalyWidget";
import NewsNoiseFilterWidget from "@/components/NewsNoiseFilterWidget";
import CorrelationWidget from "@/components/CorrelationWidget";
import VolumeProfileWidget from "@/components/VolumeProfileWidget";
import SeasonalAnalysisWidget from "@/components/SeasonalAnalysisWidget";
import InsiderTrackingWidget from "@/components/InsiderTrackingWidget";
import WhaleFlowWidget from "@/components/WhaleFlowWidget";
import SocialBuzzWidget from "@/components/SocialBuzzWidget";
import GapAnalysisWidget from "@/components/GapAnalysisWidget";
import AdvancedAnalysisCard from "@/components/AdvancedAnalysisCard";
import PatternDoppelgangerWidget from "@/components/PatternDoppelgangerWidget";
import { LineStyle } from "lightweight-charts";


export default function StockDetail() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker?.toUpperCase() ?? "";
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<"1mo" | "3mo" | "6mo" | "1y" | "2y">(
    () => {
      const saved = localStorage.getItem("chart-period");
      const valid = ["1mo", "3mo", "6mo", "1y", "2y"];
      return (valid.includes(saved ?? "") ? saved : "6mo") as
        | "1mo"
        | "3mo"
        | "6mo"
        | "1y"
        | "2y";
    }
  );
  const handlePeriodChange = (val: "1mo" | "3mo" | "6mo" | "1y" | "2y") => {
    setPeriod(val);
    localStorage.setItem("chart-period", val);
  };

  const isKR = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
  const currSymbol = isKR ? "₩" : "$";
  const formatPrice = (price: number) =>
    isKR
      ? price.toLocaleString("ko-KR")
      : price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const {
    data: summary,
    isLoading: summaryLoading,
    dataUpdatedAt: summaryUpdatedAt,
  } = trpc.stock.summary.useQuery(
    { ticker },
    { enabled: !!ticker, refetchInterval: 30 * 1000, staleTime: 25 * 1000 }
  );

  const realtimePrices = useMarketStream(ticker ? [ticker] : []);
  const realtimeData = realtimePrices[ticker];
  const realtimePrice = realtimeData?.price;
  const priceDirection = realtimeData?.direction ?? "same";

  // flash class key — changes every time price updates so animation re-triggers
  const [flashKey, setFlashKey] = useState(0);
  const prevRtPrice = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (realtimePrice && realtimePrice !== prevRtPrice.current) {
      prevRtPrice.current = realtimePrice;
      setFlashKey(k => k + 1);
    }
  }, [realtimePrice]);

  const flashClass =
    priceDirection === "up"
      ? "flash-up"
      : priceDirection === "down"
        ? "flash-down"
        : "";

  const displaySummary = useMemo(() => {
    if (!summary) return undefined;
    if (realtimePrice) {
      const prevClose = summary.price / (1 + summary.changePercent / 100);
      const cp =
        prevClose > 0 ? ((realtimePrice - prevClose) / prevClose) * 100 : 0;
      return { ...summary, price: realtimePrice, changePercent: cp };
    }
    return summary;
  }, [summary, realtimePrice]);
  const [detailLastUpdated, setDetailLastUpdated] = useState("방금 전");
  useEffect(() => {
    if (!summaryUpdatedAt) return;
    const update = () => {
      const secs = Math.round((Date.now() - summaryUpdatedAt) / 1000);
      if (secs < 5) setDetailLastUpdated("방금 전");
      else if (secs < 60) setDetailLastUpdated(`${secs}초 전`);
      else setDetailLastUpdated(`${Math.round(secs / 60)}분 전`);
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [summaryUpdatedAt]);

  const { data: candles, isLoading: candlesLoading } =
    trpc.stock.history.useQuery(
      { ticker, period },
      { enabled: !!ticker, refetchInterval: 60 * 1000, staleTime: 55 * 1000 }
    );

  const aiMutation = trpc.ai.analyze.useMutation();
  useEffect(() => {
    if (ticker && !aiMutation.data && !aiMutation.isPending) {
      aiMutation.mutate({ ticker });
    }
  }, [ticker]);

  const [showBB, setShowBB] = useState(false);
  const { data: newsSentiment, isLoading: newsLoading } =
    trpc.news.sentiment.useQuery(
      { ticker },
      { enabled: !!ticker, staleTime: 5 * 60 * 1000 }
    );
  const { data: tradeGuideData } = trpc.tradeGuide.get.useQuery(
    { ticker },
    { enabled: !!ticker }
  );
  const { data: chartPatternData, isLoading: patternLoading } =
    trpc.chartPattern.analyze.useQuery(
      { ticker },
      { enabled: !!ticker, staleTime: 10 * 60 * 1000 } // 10분 캐시
    );

  // 포트폴리오 보유 중 확인
  const { user } = useAuth();
  const { data: portfolioData } = trpc.portfolio.list.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const portfolioPositions = portfolioData?.positions ?? [];
  const heldPosition = portfolioPositions.find(
    p => p.ticker.toUpperCase() === ticker.toUpperCase()
  );
  const utils = trpc.useUtils();
  const { data: tradeLogs = [] } = trpc.tradeLogs.list.useQuery(
    { ticker },
    { enabled: !!ticker }
  );

  const { data: watchlist = [] } = trpc.watchlist.list.useQuery();
  const isInWatchlist = watchlist.some(i => i.ticker === ticker);
  const toggleWatchlist = trpc.watchlist.toggle.useMutation({
    onSuccess: res => {
      utils.watchlist.list.invalidate();
      toast.success(
        res.added
          ? "관심종목에 추가되었습니다."
          : "관심종목에서 삭제되었습니다."
      );
    },
    onError: e => toast.error(e.message),
  });

  const [tradeType, setTradeType] = useState<"buy" | "sell" | "memo">("buy");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeTargetPrice, setTradeTargetPrice] = useState("");
  const [tradeStopPrice, setTradeStopPrice] = useState("");
  const [tradeContent, setTradeContent] = useState("");
  const tradePriceRef = useRef<HTMLInputElement>(null);

  const addTradeLog = trpc.tradeLogs.add.useMutation({
    onSuccess: () => {
      utils.tradeLogs.list.invalidate({ ticker });
      setTradePrice("");
      setTradeContent("");
      setTradeTargetPrice("");
      setTradeStopPrice("");
      toast.success("매매 일지가 등록되었습니다.");
    },
    onError: e => toast.error(e.message),
  });

  const deleteTradeLog = trpc.tradeLogs.delete.useMutation({
    onSuccess: () => {
      utils.tradeLogs.list.invalidate({ ticker });
      toast.success("매매 일지가 삭제되었습니다.");
    },
    onError: e => toast.error(e.message),
  });

  const chartMarkers = useMemo(() => {
    return tradeLogs.map(log => {
      const dateStr = new Date(log.date).toISOString().slice(0, 10);
      return {
        time: dateStr as any,
        position: (log.type === "buy"
          ? "belowBar"
          : log.type === "sell"
            ? "aboveBar"
            : "inBar") as "belowBar" | "aboveBar" | "inBar",
        color:
          log.type === "buy"
            ? "#22c55e"
            : log.type === "sell"
              ? "#ef4444"
              : "#c084fc",
        shape: (log.type === "buy"
          ? "arrowUp"
          : log.type === "sell"
            ? "arrowDown"
            : "circle") as "circle" | "arrowUp" | "arrowDown" | "square",
        text:
          log.type === "buy" ? "Buy" : log.type === "sell" ? "Sell" : "Memo",
      };
    });
  }, [tradeLogs]);

  // 차트 가격 라인 (목표가 / 손절가)
  const priceLines = useMemo(() => {
    const lines: Array<{ price: number; color: string; label: string }> = [];
    tradeLogs.forEach(log => {
      if (log.targetPrice)
        lines.push({
          price: log.targetPrice,
          color: "#22c55e",
          label: `목표 ${log.targetPrice}`,
        });
      if (log.stopPrice)
        lines.push({
          price: log.stopPrice,
          color: "#ef4444",
          label: `손절 ${log.stopPrice}`,
        });
    });
    return lines;
  }, [tradeLogs]);

  // 자동 지지/저항선 탐색 (Feature 11)
  const autoS_R = useMemo(() => {
    const data = candles;
    if (!data || data.length < 20) return [];
    const prices = data.map(d => d.close);
    const levels: number[] = [];

    // 단순화된 피벗 탐색
    for (let i = 5; i < prices.length - 5; i++) {
      const p = prices[i];
      const slice = prices.slice(i - 5, i + 6);
      if (p === Math.max(...slice) || p === Math.min(...slice)) {
        // 중복 방지 (근접한 가격은 무시)
        if (!levels.some(l => Math.abs(l - p) / p < 0.01)) {
          levels.push(p);
        }
      }
    }
    // 가장 최근 데이터 기준 상위 3개만 유지
    return levels.slice(-3).map(l => ({
      price: l,
      color: "rgba(156, 163, 175, 0.3)", // 은은한 회색
      label: "S/R Level",
      style: LineStyle.Dotted,
    }));
  }, [candles]);

  // 자동 피보나치 되돌림 (Feature 14)
  const autoFib = useMemo(() => {
    if (!candles || candles.length < 20) return [];
    const prices = candles.map(c => c.close);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const diff = high - low;

    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    return levels.map(level => {
      const price = high - diff * level;
      return {
        price,
        color: "rgba(167, 139, 250, 0.4)", // 은은한 보라색
        label: `Fib ${level}`,
        style: LineStyle.Dashed,
      };
    });
  }, [candles]);

  // 차트 가격 라인 (목표가 / 손절가 + 자동 S/R + Fibonacci)
  const combinedPriceLines = useMemo(() => {
    return [...(priceLines ?? []), ...autoS_R, ...autoFib];
  }, [priceLines, autoS_R, autoFib]);

  // 매매 일지 통계
  const tradeStats = useMemo(() => {
    const buys = tradeLogs.filter(l => l.type === "buy" && l.price);
    const sells = tradeLogs.filter(l => l.type === "sell" && l.price);
    const avgBuy =
      buys.length > 0
        ? buys.reduce((s, l) => s + (l.price ?? 0), 0) / buys.length
        : null;
    const avgSell =
      sells.length > 0
        ? sells.reduce((s, l) => s + (l.price ?? 0), 0) / sells.length
        : null;
    const realizedPnlPct =
      avgBuy && avgSell ? ((avgSell - avgBuy) / avgBuy) * 100 : null;
    return {
      buyCount: buys.length,
      sellCount: sells.length,
      avgBuy,
      avgSell,
      realizedPnlPct,
    };
  }, [tradeLogs]);

  // 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "b" || e.key === "B") {
        setTradeType("buy");
        tradePriceRef.current?.focus();
      }
      if (e.key === "a" || e.key === "A") {
        setTradeType("sell");
        tradePriceRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // candles 데이터는 TradingChart에 직접 전달

  const getSignalBg = (type: string) => {
    switch (type) {
      case "buy":
        return "bg-bull/15 text-bull border-bull/30";
      case "sell":
        return "bg-bear/15 text-bear border-bear/30";
      default:
        return "bg-neutral-signal/15 text-neutral-signal border-neutral-signal/30";
    }
  };

  const getSignalLabel = (type: string) => {
    switch (type) {
      case "buy":
        return "매수";
      case "sell":
        return "매도";
      default:
        return "중립";
    }
  };
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
  const getGradeTextColor = (grade?: string) => {
    switch (grade) {
      case "strong_buy":
        return "text-emerald-400";
      case "buy":
        return "text-green-400";
      case "sell":
        return "text-orange-400";
      case "strong_sell":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };
  const getBreakdownBar = (score: number, max: number) => {
    const pct = Math.min((Math.abs(score) / max) * 100, 100);
    const color =
      score > 0 ? "bg-emerald-500" : score < 0 ? "bg-red-500" : "bg-muted";
    return { pct, color };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 상장폐지 지뢰 탐지기 알림 */}
        {displaySummary?.delistingRisk?.isHighRisk && (
          <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-5 flex items-start gap-4 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-in fade-in slide-in-from-top-4">
            <ShieldAlert className="w-8 h-8 text-red-500 shrink-0 animate-pulse mt-0.5" />
            <div>
              <h3 className="text-red-500 font-black text-lg">🚨 상장폐지 / 폭락 지뢰 경보</h3>
              <p className="text-red-400/90 text-sm mt-1 font-semibold">
                이 종목은 심각한 악재 또는 재무적 위험이 감지되어 AI가 강력히 접근을 경고합니다. 가급적 매매를 피하십시오.
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-1">
                {displaySummary.delistingRisk.warnings.map((w: string, i: number) => (
                  <li key={i} className="text-red-400/80 text-xs font-mono font-bold">{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* --- Premium Header Section --- */}
        <div className="glass-card premium-border p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/")}
                  className="h-10 w-10 rounded-xl bg-muted/40 hover:bg-muted/60"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tighter font-mono">
                      {ticker}
                    </h1>
                    <Badge
                      variant="outline"
                      className={`${getGradeBg(displaySummary?.signal.grade)} font-bold text-xs px-2.5 py-1 uppercase tracking-wider`}
                    >
                      {displaySummary?.signal.gradeLabel ??
                        getSignalLabel(
                          displaySummary?.signal.type ?? "neutral"
                        )}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        toggleWatchlist.mutate({
                          ticker,
                          name: displaySummary?.name ?? "",
                        })
                      }
                      disabled={toggleWatchlist.isPending}
                      className={`h-9 w-9 rounded-xl bg-muted/30 transition-all ${isInWatchlist ? "text-yellow-400 scale-110 shadow-lg shadow-yellow-400/20" : "text-muted-foreground"}`}
                    >
                      <Star
                        className={`h-5 w-5 ${isInWatchlist ? "fill-current" : ""}`}
                      />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {displaySummary?.name}
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-muted/50 border-none font-mono"
                    >
                      {displaySummary?.market}
                      {isKR ? " · KRW" : " · USD"}
                    </Badge>
                  </div>
                </div>
              </div>
              {heldPosition &&
                (() => {
                  const invested =
                    Number(heldPosition.avgPrice) *
                    Number(heldPosition.quantity);
                  const current =
                    (displaySummary?.price ?? 0) *
                    Number(heldPosition.quantity);
                  const pnl = current - invested;
                  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                  const isProfit = pnl >= 0;
                  return (
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${isProfit ? "bg-bull/10 border-bull/30 text-bull" : "bg-bear/10 border-bear/30 text-bear"}`}
                    >
                      <Wallet className="w-3.5 h-3.5 opacity-70" />
                      현재 보유 중: {isProfit ? "+" : ""}
                      {pnlPct.toFixed(2)}% ({isProfit ? "+" : ""}
                      {currSymbol}
                      {Math.abs(pnl).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                      )
                    </div>
                  );
                })()}
            </div>

            <div className="flex items-center gap-8 bg-muted/20 p-4 lg:p-6 rounded-2xl border border-border/40 min-w-[300px] justify-between lg:justify-end">
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                  실시간 현재가
                </p>
                <div
                  className={`text-4xl lg:text-5xl font-black font-mono tracking-tighter ${flashClass}`}
                  key={flashKey}
                >
                  {currSymbol}
                  {displaySummary ? formatPrice(displaySummary.price) : "---"}
                </div>
                <div
                  className={`flex items-center justify-end gap-1.5 mt-1 font-bold ${(displaySummary?.changePercent ?? 0) >= 0 ? "text-bull" : "text-bear"}`}
                >
                  {(displaySummary?.changePercent ?? 0) >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-lg">
                    {(displaySummary?.changePercent ?? 0) >= 0 ? "+" : ""}
                    {displaySummary?.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="h-16 w-px bg-border/40 hidden lg:block" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="w-3 h-3 text-bull animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {detailLastUpdated}
                  </span>
                </div>
                {displaySummary && (
                  <AddToPortfolioButton
                    ticker={ticker}
                    name={displaySummary.name}
                    currentPrice={displaySummary.price}
                    currency={displaySummary.currency}
                    signalScore={displaySummary.signal.strength}
                    size="sm"
                    className="bg-bull hover:bg-bull/90 text-white border-none shadow-lg shadow-bull/20 font-bold px-4"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {["1mo", "3mo", "6mo", "1y", "2y"].map(p => (
                <Button
                  key={p}
                  variant={period === p ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handlePeriodChange(p as any)}
                  className={`h-8 px-4 text-xs font-bold uppercase tracking-widest transition-all ${period === p ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {p}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="text-[10px] h-6 px-2.5 border-border/60 text-muted-foreground font-mono bg-muted/20"
              >
                AI 신호 강도: {displaySummary?.signal.strength}점
              </Badge>
            </div>
          </div>
        </div>
        
        {/* --- AI Simple Conclusion (Non-expert Summary) --- */}
        {aiMutation.data?.simpleConclusion && (
          <div className="glass-card premium-border p-5 rounded-2xl bg-primary/5 border-primary/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
                AI 한 줄 결론
              </p>
              <p className="text-base font-semibold text-foreground leading-relaxed">
                {aiMutation.data.simpleConclusion}
              </p>
            </div>
            <div className="ml-auto hidden sm:block">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => document.getElementById('ai-deep-dive')?.scrollIntoView({ behavior: 'smooth' })}
              >
                상세 분석 보기
              </Button>
            </div>
          </div>
        )}

        {/* --- Main Dashboard Grid --- */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Main Area (8/12) */}
            <div className="xl:col-span-8 space-y-6">
              {/* 차세대 분석 레이더 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AdvancedAnalysisCard ticker={ticker} />
                <PatternDoppelgangerWidget ticker={ticker} />
              </div>

              <div className="glass-card premium-border overflow-hidden rounded-2xl h-[550px] relative shadow-2xl">

                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <Badge className="bg-background/60 backdrop-blur-md border-border/40 text-[10px] h-6 px-2">
                    실시간 차트
                  </Badge>
                  <div className="flex bg-background/60 backdrop-blur-md rounded-lg p-0.5 border border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-[10px] ${!showBB ? "bg-primary text-white" : ""}`}
                      onClick={() => setShowBB(false)}
                    >
                      기본
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-[10px] ${showBB ? "bg-primary text-white" : ""}`}
                      onClick={() => setShowBB(true)}
                    >
                      볼린저밴드
                    </Button>
                  </div>
                </div>
                <TradingChart
                  data={candles ?? []}
                  priceLines={combinedPriceLines}
                  showBB={showBB}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TechnicalReport ticker={ticker} />
                <MultiAICrossCheck
                  ticker={ticker}
                  marketContext={
                    aiMutation.data?.aiComment ||
                    `${ticker} 종목의 기술적 지표가 ${displaySummary?.signal.type} 신호를 보내고 있습니다.`
                  }
                />
              </div>

              <AIDeepDive ticker={ticker} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VolumeProfileWidget data={candles ?? []} isKR={isKR} />
                <CorrelationWidget ticker={ticker} />
              </div>

              {/* 매매 일지 섹션 */}
              <Card className="glass-card premium-border h-full">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-primary" />
                      매매 일지 & 노트
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => setTradeType("buy")}
                      >
                        <TrendingUp className="h-3.5 w-3.5 text-bull" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => setTradeType("sell")}
                      >
                        <TrendingDown className="h-3.5 w-3.5 text-bear" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex bg-muted/30 p-1 rounded-xl border border-border/40">
                      <Button
                        variant={tradeType === "buy" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-8 text-[11px] font-bold"
                        onClick={() => setTradeType("buy")}
                      >
                        매수 기록
                      </Button>
                      <Button
                        variant={tradeType === "sell" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-8 text-[11px] font-bold"
                        onClick={() => setTradeType("sell")}
                      >
                        매도 기록
                      </Button>
                      <Button
                        variant={tradeType === "memo" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-8 text-[11px] font-bold"
                        onClick={() => setTradeType("memo")}
                      >
                        일반 메모
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {tradeType !== "memo" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">
                              기록가
                            </label>
                            <input
                              ref={tradePriceRef}
                              className="w-full bg-background/50 border border-border/40 rounded-lg h-9 px-3 text-sm font-mono focus:ring-1 ring-primary outline-none"
                              placeholder="가격 입력"
                              value={tradePrice}
                              onChange={e => setTradePrice(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">
                              목표/손절
                            </label>
                            <div className="flex gap-1">
                              <input
                                className="flex-1 bg-background/50 border border-border/40 rounded-lg h-9 px-2 text-xs font-mono outline-none"
                                placeholder="Target"
                                value={tradeTargetPrice}
                                onChange={e =>
                                  setTradeTargetPrice(e.target.value)
                                }
                              />
                              <input
                                className="flex-1 bg-background/50 border border-border/40 rounded-lg h-9 px-2 text-xs font-mono outline-none"
                                placeholder="Stop"
                                value={tradeStopPrice}
                                onChange={e =>
                                  setTradeStopPrice(e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">
                          내용 요약
                        </label>
                        <Textarea
                          className="min-h-[80px] bg-background/50 border border-border/40 rounded-lg text-sm resize-none"
                          placeholder="분석 내용이나 매매 근거를 기록하세요..."
                          value={tradeContent}
                          onChange={e => setTradeContent(e.target.value)}
                        />
                      </div>
                      <Button
                        className="w-full h-10 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold"
                        onClick={() =>
                          addTradeLog.mutate({
                            ticker,
                            type: tradeType as any,
                            date: Date.now(),
                            price: tradePrice ? Number(tradePrice) : undefined,
                            targetPrice: tradeTargetPrice
                              ? Number(tradeTargetPrice)
                              : undefined,
                            stopPrice: tradeStopPrice
                              ? Number(tradeStopPrice)
                              : undefined,
                            content: tradeContent,
                          })
                        }
                        disabled={
                          addTradeLog.isPending ||
                          (!tradeContent && !tradePrice)
                        }
                      >
                        <Save className="w-4 h-4 mr-2" /> 기록 저장
                      </Button>
                    </div>

                    <div className="pt-4 border-t border-border/40 max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">
                      {tradeLogs.length > 0 ? (
                        tradeLogs.map(log => (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl bg-muted/20 border border-border/40 flex items-start justify-between group transition-all hover:bg-muted/40"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] h-4 px-1.5 ${log.type === "buy" ? "bg-bull/10 text-bull" : log.type === "sell" ? "bg-bear/10 text-bear" : "bg-muted text-muted-foreground"}`}
                                >
                                  {log.type === "buy"
                                    ? "매수"
                                    : log.type === "sell"
                                      ? "매도"
                                      : "메모"}
                                </Badge>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs font-medium">
                                {log.content}
                              </p>
                              {log.price && (
                                <p className="text-[10px] font-mono text-primary font-bold">
                                  {currSymbol}
                                  {log.price.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-bear"
                              onClick={() =>
                                deleteTradeLog.mutate({ id: log.id })
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground text-center py-4 italic">
                          기록된 내용이 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI 뉴스 감성 분석 */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-yellow-400" />
                    AI 뉴스 심리 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {newsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      뉴스 데이터를 불러올 수 없습니다.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Area (4/12) */}
            <div className="xl:col-span-4 space-y-6">
              <FundamentalSummary fundamentals={displaySummary?.fundamentals} />
              <MacroContext
                ticker={ticker}
                tickerChange={displaySummary?.changePercent ?? 0}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FinancialAnomalyWidget ticker={ticker} />
                <GapAnalysisWidget ticker={ticker} />
              </div>
              <NewsNoiseFilterWidget ticker={ticker} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InsiderTrackingWidget ticker={ticker} />
                <WhaleFlowWidget ticker={ticker} />
              </div>
              <SocialBuzzWidget ticker={ticker} />
              <SeasonalAnalysisWidget ticker={ticker} />
              <CorrelationWidget ticker={ticker} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
