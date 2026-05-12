import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Play,
  Loader2,
  BarChart3,
  Target,
  Activity,
  Trophy,
  AlertTriangle,
  Zap,
  Medal,
  ChevronRight,
  CheckCircle2,
  Bot,
  Sparkles,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";

type StrategyType = "rsi" | "macd" | "ma_cross" | "combined" | "bollinger";
type OptimizeStrategyType = StrategyType | "all";
type ObjectiveType = "totalReturn" | "winRate" | "sharpeRatio";

export default function Backtest() {
  const [ticker, setTicker] = useState("AAPL");
  const [period, setPeriod] = useState<"3mo" | "6mo" | "1y" | "2y">("1y");
  const [strategyType, setStrategyType] = useState<StrategyType>("combined");
  const [rsiBuy, setRsiBuy] = useState(30);
  const [rsiSell, setRsiSell] = useState(70);
  const [maFast, setMaFast] = useState(5);
  const [maSlow, setMaSlow] = useState(20);
  const [capital, setCapital] = useState(10000);
  const [positionSize, setPositionSize] = useState(100);

  // 최적화 전용 상태
  const [optimizeTicker, setOptimizeTicker] = useState("AAPL");
  const [optimizePeriod, setOptimizePeriod] = useState<
    "3mo" | "6mo" | "1y" | "2y"
  >("1y");
  const [optimizeStrategy, setOptimizeStrategy] =
    useState<OptimizeStrategyType>("all");
  const [optimizeObjective, setOptimizeObjective] =
    useState<ObjectiveType>("totalReturn");
  const [selectedRank, setSelectedRank] = useState(0);

  const backtestMutation = trpc.backtest.run.useMutation();
  const optimizeMutation = trpc.backtest.optimize.useMutation();

  const handleRun = () => {
    backtestMutation.mutate({
      ticker: ticker.toUpperCase(),
      period,
      strategyType,
      params: {
        rsiBuyThreshold: rsiBuy,
        rsiSellThreshold: rsiSell,
        maFastPeriod: maFast,
        maSlowPeriod: maSlow,
        initialCapital: capital,
        positionSize,
      },
    });
  };

  const handleOptimize = () => {
    setSelectedRank(0);
    optimizeMutation.mutate({
      ticker: optimizeTicker.toUpperCase(),
      period: optimizePeriod,
      strategyType: optimizeStrategy,
      objective: optimizeObjective,
      topN: 5,
    });
  };

  // 최적화 결과에서 선택된 조합으로 백테스트 실행
  const handleApplyBest = (rank: number) => {
    const optResult = optimizeMutation.data;
    if (!optResult) return;
    const best = optResult.results[rank];
    if (!best) return;

    // 최적 파라미터를 수동 백테스트 탭에 적용
    setTicker(optimizeTicker);
    setPeriod(optimizePeriod);
    // 수동 탭에서 지원하는 전략만 적용 (all은 best.strategyType 사용)
    const applyStrategy = (
      optimizeStrategy === "all" ? best.strategyType : optimizeStrategy
    ) as StrategyType;
    setStrategyType(applyStrategy);
    if (best.params.rsiBuyThreshold != null)
      setRsiBuy(best.params.rsiBuyThreshold);
    if (best.params.rsiSellThreshold != null)
      setRsiSell(best.params.rsiSellThreshold);
    if (best.params.maFastPeriod != null) setMaFast(best.params.maFastPeriod);
    if (best.params.maSlowPeriod != null) setMaSlow(best.params.maSlowPeriod);
  };

  const result = backtestMutation.data;
  const optResult = optimizeMutation.data;

  const equityChartData = useMemo(() => {
    if (!result?.equityCurve) return [];
    return result.equityCurve.map(p => ({
      ...p,
      date: new Date(p.date).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      }),
      fullDate: new Date(p.date).toLocaleDateString("ko-KR"),
    }));
  }, [result]);

  // 최적화 1위 결과의 에쿼티 커브
  const optEquityChartData = useMemo(() => {
    if (!optResult?.results[selectedRank]?.fullResult?.equityCurve) return [];
    return optResult.results[selectedRank].fullResult!.equityCurve.map(p => ({
      ...p,
      date: new Date(p.date).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      }),
      fullDate: new Date(p.date).toLocaleDateString("ko-KR"),
    }));
  }, [optResult, selectedRank]);

  const EquityTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { fullDate: string; value: number; drawdown: number };
    }>;
  }) => {
    if (!active || !payload?.[0]?.payload) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-xl text-sm">
        <p className="font-semibold mb-2">{d.fullDate}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">포트폴리오 가치</span>
          <span className="font-mono text-right">
            {d.value?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-muted-foreground">낙폭</span>
          <span className="font-mono text-right text-destructive">
            -{d.drawdown?.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  };

  const objectiveLabel: Record<ObjectiveType, string> = {
    totalReturn: "총 수익률",
    winRate: "승률",
    sharpeRatio: "샤프 비율",
  };

  const rankMedal = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return `${rank + 1}위`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">백테스팅</h1>
          <p className="text-muted-foreground text-sm mt-1">
            매매 전략을 과거 데이터로 시뮬레이션하여 수익률을 검증하세요
          </p>
        </div>

        <Tabs defaultValue="manual" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3 bg-background/50 border border-border/50">
            <TabsTrigger value="manual" className="gap-2">
              <Play className="h-3.5 w-3.5" />
              수동 백테스트
            </TabsTrigger>
            <TabsTrigger value="optimize" className="gap-2">
              <Zap className="h-3.5 w-3.5" />
              자동 최적화
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              전략 비교
            </TabsTrigger>
          </TabsList>

          {/* ── 수동 백테스트 탭 ── */}
          <TabsContent value="manual">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Settings Panel */}
              <Card className="glass-card lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    전략 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      종목 티커
                    </Label>
                    <Input
                      value={ticker}
                      onChange={e => setTicker(e.target.value)}
                      placeholder="AAPL, 005930.KS 등"
                      className="bg-background/50 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      테스트 기간
                    </Label>
                    <Select
                      value={period}
                      onValueChange={v => setPeriod(v as typeof period)}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3mo">3개월</SelectItem>
                        <SelectItem value="6mo">6개월</SelectItem>
                        <SelectItem value="1y">1년</SelectItem>
                        <SelectItem value="2y">2년</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      전략 유형
                    </Label>
                    <Select
                      value={strategyType}
                      onValueChange={v => setStrategyType(v as StrategyType)}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rsi">RSI 전략</SelectItem>
                        <SelectItem value="macd">MACD 전략</SelectItem>
                        <SelectItem value="ma_cross">
                          이동평균선 크로스
                        </SelectItem>
                        <SelectItem value="combined">복합 전략</SelectItem>
                        <SelectItem value="bollinger">
                          볼린저 밴드 전략
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(strategyType === "rsi" || strategyType === "combined") && (
                    <div className="space-y-4 p-3 rounded-lg bg-background/30 border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground">
                        RSI 파라미터
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>매수 기준 (과매도)</span>
                          <span className="font-mono text-green-400">
                            {rsiBuy}
                          </span>
                        </div>
                        <Slider
                          value={[rsiBuy]}
                          onValueChange={([v]) => setRsiBuy(v)}
                          min={10}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>매도 기준 (과매수)</span>
                          <span className="font-mono text-red-400">
                            {rsiSell}
                          </span>
                        </div>
                        <Slider
                          value={[rsiSell]}
                          onValueChange={([v]) => setRsiSell(v)}
                          min={50}
                          max={90}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                  {(strategyType === "ma_cross" ||
                    strategyType === "combined") && (
                    <div className="space-y-4 p-3 rounded-lg bg-background/30 border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground">
                        이동평균선 파라미터
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>단기 MA</span>
                          <span className="font-mono">{maFast}일</span>
                        </div>
                        <Slider
                          value={[maFast]}
                          onValueChange={([v]) => setMaFast(v)}
                          min={3}
                          max={20}
                          step={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>장기 MA</span>
                          <span className="font-mono">{maSlow}일</span>
                        </div>
                        <Slider
                          value={[maSlow]}
                          onValueChange={([v]) => setMaSlow(v)}
                          min={10}
                          max={60}
                          step={1}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-4 p-3 rounded-lg bg-background/30 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground">
                      자본 설정
                    </p>
                    <div className="space-y-2">
                      <Label className="text-xs">초기 자본금</Label>
                      <Input
                        type="number"
                        value={capital}
                        onChange={e => setCapital(Number(e.target.value))}
                        className="bg-background/50 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>포지션 비중</span>
                        <span className="font-mono">{positionSize}%</span>
                      </div>
                      <Slider
                        value={[positionSize]}
                        onValueChange={([v]) => setPositionSize(v)}
                        min={10}
                        max={100}
                        step={5}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleRun}
                    disabled={backtestMutation.isPending || !ticker.trim()}
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    {backtestMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    백테스트 실행
                  </Button>
                </CardContent>
              </Card>

              {/* Results Panel */}
              <div className="lg:col-span-2 space-y-6">
                {backtestMutation.isPending && (
                  <Card className="glass-card">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                      <p className="text-sm text-muted-foreground">
                        과거 데이터를 분석하고 시뮬레이션 중입니다...
                      </p>
                    </CardContent>
                  </Card>
                )}
                {result && !backtestMutation.isPending && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card className="glass-card">
                        <CardContent className="pt-4 pb-4">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            총 수익률
                          </p>
                          <p
                            className={`text-xl font-bold font-mono ${result.totalReturn >= 0 ? "text-green-400" : "text-red-400"}`}
                          >
                            {result.totalReturn >= 0 ? "+" : ""}
                            {result.totalReturn.toFixed(2)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {result.initialCapital.toLocaleString()} →{" "}
                            {result.finalValue.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="glass-card">
                        <CardContent className="pt-4 pb-4">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            승률
                          </p>
                          <p className="text-xl font-bold font-mono">
                            {result.winRate.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {result.winningTrades}승 / {result.losingTrades}패
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="glass-card">
                        <CardContent className="pt-4 pb-4">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            최대 낙폭
                          </p>
                          <p className="text-xl font-bold font-mono text-red-400">
                            -{result.maxDrawdown.toFixed(2)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            MDD
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="glass-card">
                        <CardContent className="pt-4 pb-4">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            샤프 비율
                          </p>
                          <p className="text-xl font-bold font-mono">
                            {result.sharpeRatio?.toFixed(2) ?? "-"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            연간화
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <Card className="glass-card">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Trophy className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-sm font-medium">
                                전략 vs 단순 보유
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {result.strategyName} ({result.period})
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                전략 수익률
                              </p>
                              <p
                                className={`text-lg font-bold font-mono ${result.totalReturn >= 0 ? "text-green-400" : "text-red-400"}`}
                              >
                                {result.totalReturn >= 0 ? "+" : ""}
                                {result.totalReturn.toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                단순 보유
                              </p>
                              <p
                                className={`text-lg font-bold font-mono ${result.buyAndHoldReturn >= 0 ? "text-green-400" : "text-red-400"}`}
                              >
                                {result.buyAndHoldReturn >= 0 ? "+" : ""}
                                {result.buyAndHoldReturn.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="glass-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          포트폴리오 가치 변화
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {equityChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                              data={equityChartData}
                              margin={{
                                top: 10,
                                right: 10,
                                bottom: 0,
                                left: 0,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="equityGrad"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="oklch(0.72 0.19 250)"
                                    stopOpacity={0.3}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="oklch(0.72 0.19 250)"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="oklch(0.28 0.012 260 / 30%)"
                              />
                              <XAxis
                                dataKey="date"
                                tick={{
                                  fontSize: 10,
                                  fill: "oklch(0.65 0.015 260)",
                                }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                              />
                              <YAxis
                                tick={{
                                  fontSize: 10,
                                  fill: "oklch(0.65 0.015 260)",
                                }}
                                tickLine={false}
                                axisLine={false}
                                width={70}
                                tickFormatter={v => v.toLocaleString()}
                              />
                              <Tooltip content={<EquityTooltip />} />
                              <ReferenceLine
                                y={result.initialCapital}
                                stroke="oklch(0.65 0.015 260 / 40%)"
                                strokeDasharray="3 3"
                                label={{
                                  value: "초기 자본",
                                  fill: "oklch(0.65 0.015 260)",
                                  fontSize: 10,
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="oklch(0.72 0.19 250)"
                                fill="url(#equityGrad)"
                                strokeWidth={2}
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            데이터 없음
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="glass-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          거래 내역{" "}
                          <Badge variant="outline" className="text-[10px]">
                            {result.totalTrades}건
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {result.trades.length > 0 ? (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {result.trades.map((trade, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/30"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${trade.type === "buy" ? "bg-green-500/15" : "bg-red-500/15"}`}
                                  >
                                    {trade.type === "buy" ? (
                                      <TrendingUp className="h-4 w-4 text-green-400" />
                                    ) : (
                                      <TrendingDown className="h-4 w-4 text-red-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {trade.type === "buy" ? "매수" : "매도"}{" "}
                                      <span className="font-mono text-xs text-muted-foreground">
                                        x{trade.shares}주
                                      </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {trade.reason}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-mono font-semibold">
                                    {trade.price.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(trade.date).toLocaleDateString(
                                      "ko-KR"
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8">
                            <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              해당 기간에 매매 신호가 발생하지 않았습니다
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
                {!result && !backtestMutation.isPending && (
                  <Card className="glass-card">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        백테스팅을 시작하세요
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-md">
                        왼쪽 패널에서 종목, 전략, 파라미터를 설정한 후 "백테스트
                        실행" 버튼을 클릭하면 과거 데이터 기반 시뮬레이션 결과를
                        확인할 수 있습니다.
                      </p>
                    </CardContent>
                  </Card>
                )}
                {backtestMutation.isError && (
                  <Card className="glass-card border-destructive/30">
                    <CardContent className="flex items-center gap-3 pt-4 pb-4">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          백테스팅 실행 중 오류가 발생했습니다
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          종목 티커를 확인하고 다시 시도해주세요. 한국 주식은
                          005930.KS 형식으로 입력하세요.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── 자동 파라미터 최적화 탭 ── */}
          <TabsContent value="optimize">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Optimize Settings */}
              <Card className="glass-card lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    최적화 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-400 font-medium mb-1">
                      🔍 자동 파라미터 탐색
                    </p>
                    <p className="text-xs text-muted-foreground">
                      수십~수백 가지 파라미터 조합을 자동으로 테스트하여 해당
                      종목에서 가장 좋은 성과를 낸 설정을 찾아드립니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      종목 티커
                    </Label>
                    <Input
                      value={optimizeTicker}
                      onChange={e => setOptimizeTicker(e.target.value)}
                      placeholder="AAPL, 005930.KS 등"
                      className="bg-background/50 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      테스트 기간
                    </Label>
                    <Select
                      value={optimizePeriod}
                      onValueChange={v =>
                        setOptimizePeriod(v as typeof optimizePeriod)
                      }
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3mo">3개월</SelectItem>
                        <SelectItem value="6mo">6개월</SelectItem>
                        <SelectItem value="1y">1년 (권장)</SelectItem>
                        <SelectItem value="2y">2년</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      전략 유형
                    </Label>
                    <Select
                      value={optimizeStrategy}
                      onValueChange={v =>
                        setOptimizeStrategy(v as OptimizeStrategyType)
                      }
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          문어보기 (전체 전략 탐색)
                        </SelectItem>
                        <SelectItem value="rsi">
                          RSI 전략 (25가지 조합)
                        </SelectItem>
                        <SelectItem value="ma_cross">
                          이동평균선 크로스 (12가지 조합)
                        </SelectItem>
                        <SelectItem value="combined">
                          복합 전략 (96가지 조합)
                        </SelectItem>
                        <SelectItem value="bollinger">
                          볼린저 밴드 전략 (9가지 조합)
                        </SelectItem>
                        <SelectItem value="macd">MACD 전략</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      최적화 목표
                    </Label>
                    <Select
                      value={optimizeObjective}
                      onValueChange={v =>
                        setOptimizeObjective(v as ObjectiveType)
                      }
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="totalReturn">
                          총 수익률 최대화
                        </SelectItem>
                        <SelectItem value="winRate">승률 최대화</SelectItem>
                        <SelectItem value="sharpeRatio">
                          샤프 비율 최대화
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      {optimizeObjective === "totalReturn" &&
                        "수익률이 가장 높은 파라미터를 찾습니다."}
                      {optimizeObjective === "winRate" &&
                        "매매 성공 비율이 가장 높은 파라미터를 찾습니다."}
                      {optimizeObjective === "sharpeRatio" &&
                        "리스크 대비 수익이 가장 좋은 파라미터를 찾습니다."}
                    </p>
                  </div>

                  <Button
                    onClick={handleOptimize}
                    disabled={
                      optimizeMutation.isPending || !optimizeTicker.trim()
                    }
                    className="w-full gap-2 bg-yellow-500 hover:bg-yellow-500/90 text-black font-semibold"
                    size="lg"
                  >
                    {optimizeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    최적 파라미터 탐색
                  </Button>
                </CardContent>
              </Card>

              {/* Optimize Results */}
              <div className="lg:col-span-2 space-y-6">
                {optimizeMutation.isPending && (
                  <Card className="glass-card">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <div className="relative mb-6">
                        <Zap className="h-12 w-12 text-yellow-400 animate-pulse" />
                      </div>
                      <p className="text-sm font-medium mb-2">
                        파라미터 조합을 탐색 중입니다...
                      </p>
                      <p className="text-xs text-muted-foreground text-center max-w-xs">
                        {optimizeStrategy === "combined"
                          ? "최대 96가지"
                          : optimizeStrategy === "rsi"
                            ? "25가지"
                            : optimizeStrategy === "bollinger"
                              ? "9가지"
                              : optimizeStrategy === "all"
                                ? "전체 전략"
                                : "12가지"}{" "}
                        파라미터 조합을 순차적으로 백테스트하고 있습니다. 잠시만
                        기다려주세요.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {optResult && !optimizeMutation.isPending && (
                  <>
                    {/* Summary */}
                    <Card className="glass-card border-yellow-500/20">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Medal className="h-5 w-5 text-yellow-400" />
                            <div>
                              <p className="text-sm font-medium">최적화 완료</p>
                              <p className="text-xs text-muted-foreground">
                                {optResult.totalCombinations}가지 조합 테스트 →
                                상위 {optResult.results.length}개 결과
                                <span className="ml-2 text-yellow-400">
                                  목표: {objectiveLabel[optimizeObjective]}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI 추천 전략 하이라이트 */}
                    {optResult.aiRecommended && (
                      <Card className="glass-card border-blue-500/30 bg-blue-500/5">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <Bot className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-blue-300">
                                  AI 추천 전략
                                </p>
                                <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30 gap-1">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  가중치 스코어 최적화
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-3">
                                수익률×0.4 + 승률×0.4 - MDD×0.2 공식으로 산정한
                                최적 전략입니다.
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                <div className="p-2 rounded-md bg-background/40 border border-blue-500/20">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">
                                    전략
                                  </p>
                                  <p className="text-xs font-semibold text-blue-300 truncate">
                                    {optResult.aiRecommended.strategyName}
                                  </p>
                                </div>
                                <div className="p-2 rounded-md bg-background/40 border border-blue-500/20">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">
                                    수익률
                                  </p>
                                  <p
                                    className={`text-xs font-bold font-mono ${optResult.aiRecommended.totalReturn >= 0 ? "text-green-400" : "text-red-400"}`}
                                  >
                                    {optResult.aiRecommended.totalReturn >= 0
                                      ? "+"
                                      : ""}
                                    {optResult.aiRecommended.totalReturn.toFixed(
                                      1
                                    )}
                                    %
                                  </p>
                                </div>
                                <div className="p-2 rounded-md bg-background/40 border border-blue-500/20">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">
                                    승률
                                  </p>
                                  <p className="text-xs font-bold font-mono">
                                    {optResult.aiRecommended.winRate.toFixed(0)}
                                    %
                                  </p>
                                </div>
                                <div className="p-2 rounded-md bg-background/40 border border-blue-500/20">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">
                                    복합 스코어
                                  </p>
                                  <p className="text-xs font-bold font-mono text-blue-300">
                                    {optResult.aiRecommended.compositeScore.toFixed(
                                      1
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="gap-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
                                variant="outline"
                                onClick={() => {
                                  // AI 추천 전략을 수동 탭에 적용
                                  setTicker(optimizeTicker);
                                  setPeriod(optimizePeriod);
                                  const aiStrat = optResult.aiRecommended!
                                    .strategyType as StrategyType;
                                  setStrategyType(aiStrat);
                                  if (
                                    optResult.aiRecommended!.params
                                      .rsiBuyThreshold != null
                                  )
                                    setRsiBuy(
                                      optResult.aiRecommended!.params
                                        .rsiBuyThreshold
                                    );
                                  if (
                                    optResult.aiRecommended!.params
                                      .rsiSellThreshold != null
                                  )
                                    setRsiSell(
                                      optResult.aiRecommended!.params
                                        .rsiSellThreshold
                                    );
                                  if (
                                    optResult.aiRecommended!.params
                                      .maFastPeriod != null
                                  )
                                    setMaFast(
                                      optResult.aiRecommended!.params
                                        .maFastPeriod
                                    );
                                  if (
                                    optResult.aiRecommended!.params
                                      .maSlowPeriod != null
                                  )
                                    setMaSlow(
                                      optResult.aiRecommended!.params
                                        .maSlowPeriod
                                    );
                                }}
                              >
                                <ChevronRight className="h-3 w-3" />
                                AI 추천 전략을 수동 탭에 적용
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Top Results Ranking */}
                    <Card className="glass-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          최적 파라미터 순위
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {optResult.results.map((r, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedRank(idx)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                              selectedRank === idx
                                ? "border-yellow-500/50 bg-yellow-500/10"
                                : "border-border/30 bg-background/30 hover:border-border/60"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {rankMedal(idx)}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-medium">
                                      {r.strategyName}
                                    </p>
                                    {optResult.aiRecommended &&
                                      r.strategyName ===
                                        optResult.aiRecommended
                                          .strategyName && (
                                        <Badge className="text-[9px] py-0 px-1.5 bg-blue-500/20 text-blue-300 border-blue-500/30 gap-0.5">
                                          <Bot className="h-2 w-2" />
                                          AI
                                        </Badge>
                                      )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {r.totalTrades}회 거래
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <div>
                                  <p className="text-[10px] text-muted-foreground">
                                    수익률
                                  </p>
                                  <p
                                    className={`text-sm font-bold font-mono ${r.totalReturn >= 0 ? "text-green-400" : "text-red-400"}`}
                                  >
                                    {r.totalReturn >= 0 ? "+" : ""}
                                    {r.totalReturn.toFixed(1)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">
                                    승률
                                  </p>
                                  <p className="text-sm font-bold font-mono">
                                    {r.winRate.toFixed(0)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">
                                    MDD
                                  </p>
                                  <p className="text-sm font-bold font-mono text-red-400">
                                    -{r.maxDrawdown.toFixed(1)}%
                                  </p>
                                </div>
                                {selectedRank === idx && (
                                  <CheckCircle2 className="h-4 w-4 text-yellow-400 shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Selected Result Detail */}
                    {optResult.results[selectedRank] && (
                      <>
                        <Card className="glass-card border-yellow-500/20">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium">
                                {rankMedal(selectedRank)}{" "}
                                {optResult.results[selectedRank].strategyName} —
                                상세 성과
                              </CardTitle>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                                onClick={() => handleApplyBest(selectedRank)}
                              >
                                <ChevronRight className="h-3 w-3" />
                                수동 탭에 적용
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <div className="p-3 rounded-lg bg-background/30 border border-border/30">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                  총 수익률
                                </p>
                                <p
                                  className={`text-lg font-bold font-mono ${optResult.results[selectedRank].totalReturn >= 0 ? "text-green-400" : "text-red-400"}`}
                                >
                                  {optResult.results[selectedRank]
                                    .totalReturn >= 0
                                    ? "+"
                                    : ""}
                                  {optResult.results[
                                    selectedRank
                                  ].totalReturn.toFixed(2)}
                                  %
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-background/30 border border-border/30">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                  승률
                                </p>
                                <p className="text-lg font-bold font-mono">
                                  {optResult.results[
                                    selectedRank
                                  ].winRate.toFixed(1)}
                                  %
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-background/30 border border-border/30">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                  최대 낙폭
                                </p>
                                <p className="text-lg font-bold font-mono text-red-400">
                                  -
                                  {optResult.results[
                                    selectedRank
                                  ].maxDrawdown.toFixed(2)}
                                  %
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-background/30 border border-border/30">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                  샤프 비율
                                </p>
                                <p className="text-lg font-bold font-mono">
                                  {optResult.results[
                                    selectedRank
                                  ].sharpeRatio?.toFixed(2) ?? "-"}
                                </p>
                              </div>
                            </div>

                            {/* Equity curve for selected result (1위만 fullResult 있음) */}
                            {selectedRank === 0 &&
                              optEquityChartData.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-3">
                                    포트폴리오 가치 변화 (최적 파라미터 적용)
                                  </p>
                                  <ResponsiveContainer
                                    width="100%"
                                    height={220}
                                  >
                                    <AreaChart
                                      data={optEquityChartData}
                                      margin={{
                                        top: 5,
                                        right: 10,
                                        bottom: 0,
                                        left: 0,
                                      }}
                                    >
                                      <defs>
                                        <linearGradient
                                          id="optEquityGrad"
                                          x1="0"
                                          y1="0"
                                          x2="0"
                                          y2="1"
                                        >
                                          <stop
                                            offset="5%"
                                            stopColor="oklch(0.78 0.18 95)"
                                            stopOpacity={0.3}
                                          />
                                          <stop
                                            offset="95%"
                                            stopColor="oklch(0.78 0.18 95)"
                                            stopOpacity={0}
                                          />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="oklch(0.28 0.012 260 / 30%)"
                                      />
                                      <XAxis
                                        dataKey="date"
                                        tick={{
                                          fontSize: 10,
                                          fill: "oklch(0.65 0.015 260)",
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                      />
                                      <YAxis
                                        tick={{
                                          fontSize: 10,
                                          fill: "oklch(0.65 0.015 260)",
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={70}
                                        tickFormatter={v => v.toLocaleString()}
                                      />
                                      <Tooltip content={<EquityTooltip />} />
                                      <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="oklch(0.78 0.18 95)"
                                        fill="url(#optEquityGrad)"
                                        strokeWidth={2}
                                        isAnimationActive={false}
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            {selectedRank > 0 && (
                              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                                <p>
                                  에쿼티 커브는 1위 결과에서만 제공됩니다. "수동
                                  탭에 적용" 버튼으로 상세 분석이 가능합니다.
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </>
                )}

                {!optResult && !optimizeMutation.isPending && (
                  <Card className="glass-card">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        자동 최적화를 시작하세요
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-md">
                        종목과 전략 유형을 선택한 후 "최적 파라미터 탐색" 버튼을
                        클릭하면, 수십~수백 가지 파라미터 조합을 자동으로
                        테스트하여 최고 성과의 설정을 찾아드립니다.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {optimizeMutation.isError && (
                  <Card className="glass-card border-destructive/30">
                    <CardContent className="flex items-center gap-3 pt-4 pb-4">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          최적화 실행 중 오류가 발생했습니다
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {optimizeMutation.error?.message ??
                            "종목 티커를 확인하고 다시 시도해주세요."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          {/* ── 전략 비교 탭 ── */}
          <TabsContent value="compare">
            <StrategyCompare />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ─── 전략 비교 컴포넌트 ───
function StrategyCompare() {
  const [ticker, setTicker] = useState("AAPL");
  const [period, setPeriod] = useState<"3mo" | "6mo" | "1y" | "2y">("1y");
  const [capital, setCapital] = useState(10000);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<
    Array<{ strategy: string; label: string; data: any }>
  >([]);

  const runMutation = trpc.backtest.run.useMutation();

  const STRATEGIES: Array<{ value: string; label: string; color: string }> = [
    { value: "rsi", label: "RSI", color: "#3b82f6" },
    { value: "macd", label: "MACD", color: "#10b981" },
    { value: "ma_cross", label: "MA 크로스", color: "#f59e0b" },
    { value: "bollinger", label: "볼린저", color: "#8b5cf6" },
    { value: "combined", label: "복합", color: "#ef4444" },
  ];

  const handleCompare = async () => {
    setRunning(true);
    setResults([]);
    const all = await Promise.allSettled(
      STRATEGIES.map(s =>
        runMutation.mutateAsync({
          ticker: ticker.toUpperCase(),
          period,
          strategyType: s.value as any,
          params: {
            rsiBuyThreshold: 30,
            rsiSellThreshold: 70,
            maFastPeriod: 5,
            maSlowPeriod: 20,
            initialCapital: capital,
          },
        })
      )
    );
    const res = all
      .map((r, i) =>
        r.status === "fulfilled"
          ? {
              strategy: STRATEGIES[i].value,
              label: STRATEGIES[i].label,
              data: r.value,
            }
          : null
      )
      .filter(Boolean) as Array<{ strategy: string; label: string; data: any }>;
    setResults(res);
    setRunning(false);
  };

  // 에쿠이티 커브 데이터 합치
  const equityData = useMemo(() => {
    if (results.length === 0) return [];
    const maxLen = Math.max(
      ...results.map(r => r.data.equityCurve?.length ?? 0)
    );
    return Array.from({ length: maxLen }, (_, i) => {
      const point: Record<string, any> = { index: i };
      results.forEach(r => {
        const curve = r.data.equityCurve ?? [];
        if (curve[i]) point[r.label] = curve[i].value;
      });
      return point;
    });
  }, [results]);

  return (
    <div className="space-y-6">
      {/* 설정 */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            전략 비교 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                종목 티커
              </Label>
              <Input
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="bg-background/50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                테스트 기간
              </Label>
              <Select
                value={period}
                onValueChange={v => setPeriod(v as typeof period)}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3mo">3개월</SelectItem>
                  <SelectItem value="6mo">6개월</SelectItem>
                  <SelectItem value="1y">1년</SelectItem>
                  <SelectItem value="2y">2년</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                초기 자본 ($)
              </Label>
              <Input
                type="number"
                value={capital}
                onChange={e => setCapital(Number(e.target.value))}
                className="bg-background/50"
              />
            </div>
          </div>
          <Button onClick={handleCompare} disabled={running} className="gap-2">
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running ? "전략 비교 실행 중..." : "모든 전략 비교 실행"}
          </Button>
          <p className="text-xs text-muted-foreground">
            RSI, MACD, MA 크로스, 볼린저 밴드, 복합 전략 5개를 동시에 실행하여
            에쿠이티 커브를 비교합니다.
          </p>
        </CardContent>
      </Card>

      {/* 에쿠이티 커브 차트 */}
      {results.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              에쿠이티 커브 비교
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={equityData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="index"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={v => `$${v.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(v: any, name: string) => [
                    `$${Number(v).toLocaleString()}`,
                    name,
                  ]}
                />
                {STRATEGIES.map(s => (
                  <Line
                    key={s.label}
                    type="monotone"
                    dataKey={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 성과 요약 테이블 */}
      {results.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              전략별 성과 요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">
                      전략
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      수익률
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      승률
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      MDD
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      샤프비율
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      총 거래
                    </th>
                    <th className="text-right py-2 pl-2 text-muted-foreground font-medium">
                      복합 점수
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results
                    .map(r => ({
                      ...r,
                      score:
                        (r.data.annualizedReturn ?? 0) * 0.4 +
                        (r.data.winRate ?? 0) * 0.4 -
                        (r.data.maxDrawdown ?? 0) * 0.2,
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map((r, idx) => {
                      const ret = r.data.totalReturn ?? 0;
                      const isPos = ret >= 0;
                      const color =
                        STRATEGIES.find(s => s.value === r.strategy)?.color ??
                        "#888";
                      return (
                        <tr
                          key={r.strategy}
                          className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-medium">{r.label}</span>
                              {idx === 0 && (
                                <Badge className="text-xs h-4 px-1 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                  크라운
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td
                            className={`text-right py-2.5 px-2 font-medium ${isPos ? "text-green-400" : "text-red-400"}`}
                          >
                            {isPos ? "+" : ""}
                            {ret.toFixed(2)}%
                          </td>
                          <td className="text-right py-2.5 px-2">
                            {(r.data.winRate ?? 0).toFixed(1)}%
                          </td>
                          <td className="text-right py-2.5 px-2 text-red-400">
                            {(r.data.maxDrawdown ?? 0).toFixed(2)}%
                          </td>
                          <td className="text-right py-2.5 px-2">
                            {r.data.sharpeRatio != null
                              ? r.data.sharpeRatio.toFixed(2)
                              : "-"}
                          </td>
                          <td className="text-right py-2.5 px-2">
                            {r.data.totalTrades ?? 0}회
                          </td>
                          <td className="text-right py-2.5 pl-2 font-bold text-primary">
                            {r.score.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
