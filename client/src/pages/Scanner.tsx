import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Play,
  RefreshCw,
  Zap,
  BarChart2,
  Clock,
  CheckCircle2,
  BrainCircuit,
  Minus,
  AlertTriangle,
  Bot,
} from "lucide-react";

import { Link } from "wouter";
import { toast } from "sonner";
import AddToPortfolioButton from "@/components/AddToPortfolioButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import ScannerAIInsights from "@/components/ScannerAIInsights";

type Market = "us" | "kr" | "all";
type SignalFilter = "all" | "buy" | "sell" | "neutral";

export default function Scanner() {
  const [market, setMarket] = useState<Market>("us");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");
  const [sortBy, setSortBy] = useState<"score" | "change" | "ticker">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [hideHeld, setHideHeld] = useState(false);
  const [minScore, setMinScore] = useState<number>(0);
  const [rsiRange, setRsiRange] = useState<{min: number, max: number}>({ min: 0, max: 100 });
  const [isPolling, setIsPolling] = useState(false);
  const [quantPrompt, setQuantPrompt] = useState("");
  const [quantExplanation, setQuantExplanation] = useState<string | null>(null);
  
  const isMobile = useIsMobile();
  const utils = trpc.useUtils();
  const { user } = useAuth();

  // 포트폴리오 데이터 (보유 종목 제외 필터링용)
  const { data: portfolioData } = trpc.portfolio.list.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  
  const portfolioPositions = portfolioData?.positions ?? [];
  const heldTickers = new Set(
    portfolioPositions.map(p => p.ticker.toUpperCase())
  );
  
  const quantMutation = trpc.ai.generateQuantScanner.useMutation({
    onSuccess: (data) => {
      setMarket(data.market === "all" ? "us" : data.market);
      setMinScore(data.minScore);
      setRsiRange(data.rsiRange);
      setSignalFilter(data.signalFilter);
      setQuantExplanation(data.explanation);
      toast.success("AI가 맞춤형 검색 조건을 설정했습니다!");
      handleStartScan();
    },
    onError: () => {
      toast.error("조건을 분석하지 못했습니다. 더 쉽게 설명해주세요.");
    }
  });

  const startScan = trpc.scanner.start.useMutation();
  const { data: scanData } = trpc.scanner.status.useQuery(
    { market },
    { refetchInterval: isPolling ? 3000 : false }
  );

  useEffect(() => {
    if (scanData?.completedAt && isPolling) {
      setIsPolling(false);
    }
  }, [scanData?.completedAt, isPolling]);

  const handleStartScan = async () => {
    setIsPolling(true);
    await startScan.mutateAsync({ market });
  };

  const handleMarketChange = (val: Market) => {
    setMarket(val);
    setIsPolling(false);
  };

  const filteredResults = (scanData?.results ?? [])
    .filter(r => {
      if (signalFilter === "all") return true;
      return r.signalType === signalFilter;
    })
    .filter(r => {
      if (hideHeld) return !heldTickers.has(r.ticker.toUpperCase());
      return true;
    })
    .filter(r => r.signalStrength >= minScore)
    .filter(r => {
      if (r.rsi == null) return true;
      return r.rsi >= rsiRange.min && r.rsi <= rsiRange.max;
    })
    .sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === "score") {
        valA = a.signalStrength;
        valB = b.signalStrength;
      } else if (sortBy === "change") {
        valA = a.changePercent;
        valB = b.changePercent;
      } else if (sortBy === "ticker") {
        valA = a.ticker;
        valB = b.ticker;
      }

      if (sortOrder === "desc") {
        return valA > valB ? -1 : 1;
      } else {
        return valA < valB ? -1 : 1;
      }
    });

  const handleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const buyCount = (scanData?.results ?? []).filter(
    r => r.signalType === "buy"
  ).length;
  const sellCount = (scanData?.results ?? []).filter(
    r => r.signalType === "sell"
  ).length;
  const neutralCount = (scanData?.results ?? []).filter(
    r => r.signalType === "neutral"
  ).length;

  const isRunning = scanData?.isRunning ?? false;
  const progress = scanData?.progress ?? 0;
  const hasResults = (scanData?.results?.length ?? 0) > 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="page-header-accent">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-yellow-400/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              종목 스캐너
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1.5">
              미국·한국 주요 종목을 AI가 자동 스캔하여 최적의 매수 권고 종목을
              찾아드립니다
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
              {(["us", "kr", "all"] as Market[]).map(m => (
                <Button
                  key={m}
                  variant={market === m ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleMarketChange(m)}
                  className={`h-7 px-3 text-xs font-semibold ${
                    market === m ? "bg-primary text-white shadow" : "text-muted-foreground"
                  }`}
                >
                  {m === "us" ? "🇺🇸 미국" : m === "kr" ? "🇰🇷 한국" : "🌏 전체"}
                </Button>
              ))}
            </div>
            <Button
              onClick={handleStartScan}
              disabled={isRunning || startScan.isPending}
              className="gap-2 h-9 bg-bull hover:bg-bull/85 text-white shadow-lg shadow-bull/20 font-semibold"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  스캔 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  스캔 시작
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 진행 상황 */}
        {(isRunning || progress > 0) && (
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                      <span className="text-xs md:text-sm">
                        스캔 중... {scanData?.scanned ?? 0} /{" "}
                        {scanData?.total ?? 0}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs md:text-sm">
                        완료 — {scanData?.scanned ?? 0}개 분석
                      </span>
                    </>
                  )}
                </div>
                <span className="text-sm font-mono text-emerald-400">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              {scanData?.completedAt && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  완료:{" "}
                  {new Date(scanData.completedAt).toLocaleTimeString("ko-KR")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI 인사이트 */}
        {hasResults && <ScannerAIInsights market={market} />}

        {/* 자연어 퀀트 봇 메이커 (No-Code Quant) */}
        <Card className="glass-card premium-border overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Bot className="w-24 h-24" />
          </div>
          <CardContent className="pt-6 pb-6 relative z-10">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-primary">
              <Bot className="w-5 h-5" />
              자연어 퀀트 봇 (No-Code Quant)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              복잡한 필터 설정 없이 원하는 종목을 말로 설명해주세요. AI가 알아서 스캐너 조건을 맞추고 검색해 드립니다.
              (예: "RSI가 30 이하로 떨어져서 싸진 매수 타이밍인 한국 주식 찾아줘")
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={quantPrompt}
                onChange={(e) => setQuantPrompt(e.target.value)}
                placeholder="어떤 종목을 찾고 싶으신가요?"
                className="flex-1 h-10 px-4 rounded-lg bg-background/50 border border-border focus:outline-none focus:border-primary text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quantPrompt.trim() && !quantMutation.isPending) {
                    quantMutation.mutate({ prompt: quantPrompt });
                  }
                }}
              />
              <Button 
                onClick={() => quantPrompt.trim() && quantMutation.mutate({ prompt: quantPrompt })}
                disabled={quantMutation.isPending || !quantPrompt.trim()}
                className="gap-2"
              >
                {quantMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <BrainCircuit className="w-4 h-4" />
                )}
                AI 스캔
              </Button>
            </div>
            
            {quantExplanation && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary-foreground/90 flex items-start gap-2">
                <BrainCircuit className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{quantExplanation}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 스캔 필터 및 정렬 툴바 */}
        {hasResults && (
          <div className="flex flex-wrap items-center justify-between gap-4 glass-card p-4 rounded-xl premium-border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-muted/50 p-1 rounded-lg">
                {(["all", "buy", "sell", "neutral"] as SignalFilter[]).map(
                  f => (
                    <Button
                      key={f}
                      variant={signalFilter === f ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSignalFilter(f)}
                      className="px-3 h-8 text-xs font-semibold"
                    >
                      {f === "all"
                        ? `전체 (${scanData?.results.length})`
                        : f === "buy"
                          ? `매수 (${buyCount})`
                          : f === "sell"
                            ? `매도 (${sellCount})`
                            : `중립 (${neutralCount})`}
                    </Button>
                  )
                )}
              </div>

              <div className="h-4 w-px bg-border mx-1 hidden md:block" />

              <div className="flex items-center gap-2">
                <Button
                  variant={sortBy === "score" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleSort("score")}
                  className="h-8 gap-2 text-xs"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  AI 점수순{" "}
                  {sortBy === "score" && (sortOrder === "desc" ? "↓" : "↑")}
                </Button>
                <Button
                  variant={sortBy === "change" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleSort("change")}
                  className="h-8 gap-2 text-xs"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  등락률순{" "}
                  {sortBy === "change" && (sortOrder === "desc" ? "↓" : "↑")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideHeld}
                  onChange={e => setHideHeld(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary"
                />
                보유 종목 제외
              </label>
              
              <div className="hidden md:flex items-center gap-3 bg-card px-3 py-1.5 rounded-md border border-border/50">
                <span className="text-[10px] text-muted-foreground font-bold">최소 강도:</span>
                <input 
                  type="range" min="0" max="100" step="5" value={minScore} 
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-[10px] font-mono">{minScore}pt</span>
              </div>
              
              <div className="hidden md:flex items-center gap-1 bg-card px-1 py-1 rounded-md border border-border/50">
                <span className="text-[10px] text-muted-foreground font-bold px-1">RSI:</span>
                {[
                  { label: "전체", val: "all" },
                  { label: "과매도", val: "oversold" },
                  { label: "중립", val: "neutral" },
                  { label: "과매수", val: "overbought" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => {
                      if (opt.val === "all") setRsiRange({ min: 0, max: 100 });
                      else if (opt.val === "oversold") setRsiRange({ min: 0, max: 35 });
                      else if (opt.val === "overbought") setRsiRange({ min: 70, max: 100 });
                      else if (opt.val === "neutral") setRsiRange({ min: 35, max: 70 });
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all ${
                      (opt.val === "all" && rsiRange.min === 0 && rsiRange.max === 100) ||
                      (opt.val === "oversold" && rsiRange.max === 35) ||
                      (opt.val === "overbought" && rsiRange.min === 70) ||
                      (opt.val === "neutral" && rsiRange.min === 35 && rsiRange.max === 70)
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSignalFilter("buy");
                  setSortBy("score");
                  setSortOrder("desc");
                  setHideHeld(false);
                  setMinScore(0);
                  setRsiRange({min: 0, max: 100});
                }}
                className="h-8 text-muted-foreground hover:text-foreground text-xs"
              >
                초기화
              </Button>
            </div>
          </div>
        )}

        {/* 결과 - 모바일: 카드형, 데스크탑: 테이블 */}
        {hasResults ? (
          <Card className="bg-card border-border overflow-hidden premium-border">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-muted-foreground" />
                  분석 결과 리스트
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4">
                    {filteredResults.length}개 종목
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] text-muted-foreground hover:text-destructive h-6 px-2"
                  onClick={() => {
                    if (confirm("스캔 결과를 화면에서 지우시겠습니까?")) {
                      utils.scanner.status.setData({ market }, (prev: any) => {
                        if (!prev) return prev;
                        return { ...prev, results: [] };
                      });
                    }
                  }}
                >
                  결과 비우기
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isMobile ? (
                /* 모바일: 카드형 목록 */
                <div className="divide-y divide-border">
                  {filteredResults.map(r => (
                    <div
                      key={r.ticker}
                      className={`p-3 ${heldTickers.has(r.ticker.toUpperCase()) ? "bg-green-500/5 border-l-2 border-l-green-500/50" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">
                              {r.ticker}
                            </span>
                            {r.signalType === "buy" ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                매수
                              </Badge>
                            ) : r.signalType === "sell" ? (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">
                                매도
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[10px] px-1.5 py-0">
                                중립
                              </Badge>
                            )}
                            {heldTickers.has(r.ticker.toUpperCase()) && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 text-green-500 border-green-500/40 bg-green-500/10"
                              >
                                ✓ 보유
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                            {r.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold">
                            {r.currencySymbol}
                            {r.price.toLocaleString()}
                          </p>
                          <p
                            className={`text-xs font-mono ${r.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {r.changePercent >= 0 ? "+" : ""}
                            {r.changePercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                        <div>
                          <span className="text-muted-foreground">강도 </span>
                          <span className="font-mono font-semibold">
                            {r.signalStrength}pt
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">RSI </span>
                          <span
                            className={`font-mono ${r.rsi != null && r.rsi > 70 ? "text-red-400" : r.rsi != null && r.rsi < 30 ? "text-emerald-400" : ""}`}
                          >
                            {r.rsi?.toFixed(1) ?? "—"}
                          </span>
                        </div>
                        {r.tradeGuide && (
                          <div>
                            <span className="text-muted-foreground">R/R </span>
                            <span className="font-mono text-yellow-400">
                              1:{r.tradeGuide.riskRewardRatio}
                            </span>
                          </div>
                        )}
                      </div>
                      {r.tradeGuide && (
                        <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                          <div>
                            <span className="text-muted-foreground">진입 </span>
                            <span className="font-mono text-sky-300">
                              {r.currencySymbol}
                              {r.tradeGuide.entryPrice.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">목표 </span>
                            <span className="font-mono text-emerald-400">
                              {r.currencySymbol}
                              {r.tradeGuide.targetPrice1.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">손절 </span>
                            <span className="font-mono text-red-400">
                              {r.currencySymbol}
                              {r.tradeGuide.stopLoss.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {(r.strategyLabel || r.recommendedHold) && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {r.strategyLabel && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {r.strategyLabel}
                            </span>
                          )}
                          {r.recommendedHold && (
                            <span className="bg-sky-500/10 text-sky-400 text-[9px] px-1.5 py-0.5 rounded border border-sky-500/20">
                              {r.recommendedHold}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <AddToPortfolioButton
                          ticker={r.ticker}
                          name={r.name}
                          currentPrice={r.price}
                          currency={r.currency}
                          signalScore={r.signalStrength}
                          size="sm"
                          variant="ghost"
                        />
                        <Link href={`/stock/${r.ticker}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 bg-transparent hover:bg-white/10"
                          >
                            분석
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* 데스크탑: 테이블 */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs text-muted-foreground w-24">
                          티커
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground">
                          종목명
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right">
                          현재가
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right">
                          등락률
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground text-center">
                          신호
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground text-center">
                          강도
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground text-right">
                          RSI
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground">
                          진입가
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground">
                          목표가
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground">
                          손절가
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground text-center">
                          R/R
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground">
                          투자 전략
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map(r => (
                        <TableRow
                          key={r.ticker}
                          className={`border-border hover:bg-white/5 cursor-pointer ${
                            heldTickers.has(r.ticker.toUpperCase())
                              ? "bg-green-500/5 border-l-2 border-l-green-500/50"
                              : ""
                          }`}
                        >
                          <TableCell className="font-mono text-sm font-semibold text-foreground">
                            <div className="flex flex-col gap-0.5">
                              <span>{r.ticker}</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                {r.market === "KOSPI"
                                  ? "KS"
                                  : r.market === "KOSDAQ"
                                    ? "KQ"
                                    : "US"}
                              </span>
                              {heldTickers.has(r.ticker.toUpperCase()) && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 text-green-500 border-green-500/40 bg-green-500/10 w-fit"
                                >
                                  ✓ 보유 중
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                            {r.name}
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono">
                            {r.currencySymbol}
                            {r.price.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={`text-sm text-right font-mono ${r.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {r.changePercent >= 0 ? "+" : ""}
                            {r.changePercent.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center">
                            {r.signalType === "buy" ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                매수
                              </Badge>
                            ) : r.signalType === "sell" ? (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                매도
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">
                                <Minus className="w-3 h-3 mr-1" />
                                중립
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Badge
                                className={`text-xs ${
                                  r.signalGrade === "strong_buy"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                    : r.signalGrade === "buy"
                                      ? "bg-green-500/20 text-green-400 border-green-500/40"
                                      : r.signalGrade === "sell"
                                        ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                                        : r.signalGrade === "strong_sell"
                                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                                }`}
                              >
                                {r.signalGrade === "strong_buy"
                                  ? "강력 매수"
                                  : r.signalGrade === "buy"
                                    ? "매수"
                                    : r.signalGrade === "sell"
                                      ? "매도"
                                      : r.signalGrade === "strong_sell"
                                        ? "강력 매도"
                                        : "관망"}
                              </Badge>
                              <span className="text-xs font-mono text-muted-foreground">
                                {r.signalStrength}점
                              </span>
                            </div>
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm font-mono ${r.rsi != null && r.rsi > 70 ? "text-red-400" : r.rsi != null && r.rsi < 30 ? "text-emerald-400" : "text-muted-foreground"}`}
                          >
                            {r.rsi?.toFixed(1) ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-sky-300">
                            {r.tradeGuide
                              ? `${r.currencySymbol}${r.tradeGuide.entryPrice.toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-emerald-400">
                            {r.tradeGuide
                              ? `${r.currencySymbol}${r.tradeGuide.targetPrice1.toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-red-400">
                            {r.tradeGuide
                              ? `${r.currencySymbol}${r.tradeGuide.stopLoss.toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center text-sm font-mono text-yellow-400">
                            {r.tradeGuide
                              ? `1:${r.tradeGuide.riskRewardRatio}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-emerald-400 font-bold">
                                {r.strategyLabel || "중립"}
                              </span>
                              <span className="text-[10px] text-sky-400 font-medium">
                                {r.recommendedHold || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <AddToPortfolioButton
                                ticker={r.ticker}
                                name={r.name}
                                currentPrice={r.price}
                                currency={r.currency}
                                signalScore={r.signalStrength}
                                size="sm"
                                variant="ghost"
                              />
                              <Link href={`/stock/${r.ticker}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 bg-transparent hover:bg-white/10"
                                >
                                  분석
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : !isRunning ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">
                스캔 결과가 없습니다
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                시장을 선택하고 "스캔 시작" 버튼을 눌러 종목을 분석하세요
              </p>
              <Button
                onClick={handleStartScan}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Play className="w-4 h-4" />
                지금 스캔하기
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* 주의사항 */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground/60 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500/60 shrink-0 mt-0.5" />
          <span>
            본 스캐너는 기술적 지표(RSI, MACD, 이동평균선)를 기반으로 자동
            분석한 참고 정보입니다. 실제 투자 결정은 반드시 본인의 판단과 책임
            하에 이루어져야 하며, 투자 손실에 대한 책임은 투자자 본인에게
            있습니다.
          </span>
        </div>

        <ScanHistorySection market={market === "all" ? "us" : market} />
      </div>
    </DashboardLayout>
  );
}

function ScanHistorySection({ market }: { market: "us" | "kr" }) {
  const { data: history = [], isLoading } = trpc.scanHistory.list.useQuery(
    { market, limit: 5 },
    { staleTime: 60 * 1000 }
  );

  if (isLoading || history.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          이전 스캔 히스토리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((h: any) => (
          <div
            key={h.id}
            className="border border-border/50 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {new Date(h.scannedAt).toLocaleString()}
              </span>
              <Badge variant="outline" className="text-xs">
                {h.totalScanned}종목 스캔
              </Badge>
            </div>
            {h.topBuys?.length > 0 && (
              <div>
                <p className="text-xs text-green-400 font-medium mb-1">
                  매수 신호 상위
                </p>
                <div className="flex flex-wrap gap-1">
                  {h.topBuys.slice(0, 5).map((b: any) => (
                    <Badge
                      key={b.ticker}
                      variant="outline"
                      className="text-xs font-mono"
                    >
                      {b.ticker}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {h.topSells?.length > 0 && (
              <div>
                <p className="text-xs text-red-400 font-medium mb-1">
                  매도 신호 상위
                </p>
                <div className="flex flex-wrap gap-1">
                  {h.topSells.slice(0, 5).map((s: any) => (
                    <Badge
                      key={s.ticker}
                      variant="outline"
                      className="text-xs font-mono"
                    >
                      {s.ticker}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
