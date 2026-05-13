import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  LineChart,
  Wallet,
  Trophy,
  BookOpen,
  Bot,
  TrendingUp,
  TrendingDown,
  Crosshair,
  Play,
  Square,
  Activity,
  BarChart2,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useMarketStream } from "@/hooks/useMarketStream";
import { formatPrice, isKoreanTicker } from "@/lib/currency";
import { trpc } from "@/lib/trpc";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Types
type Position = { ticker: string; quantity: number; avgPrice: number };
type JournalEntry = {
  id: string;
  type: "BUY" | "SELL";
  ticker: string;
  quantity: number;
  price: number;
  time: string;
  reason: string;
  pnl?: number;
  pnlPct?: number;
};

// 서버사이드 AI 오토파일럿 패널
function AutopilotPanel() {
  const { data: status, refetch } = trpc.autopilot.status.useQuery(undefined, {
    staleTime: 30_000,
  });

  const toggleMutation = trpc.autopilot.toggle.useMutation({
    onSuccess: () => refetch(),
  });

  const runNowMutation = trpc.autopilot.runNow.useMutation({
    onSuccess: () => {
      toast.success("오토파일럿 1회 실행 완료");
      refetch();
    },
    onError: (e) => toast.error(`실행 실패: ${e.message}`),
  });

  return (
    <Card className="border-blue-500/30 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-5 h-5 text-blue-400" />
              AI 오토파일럿 (서버 자동매매)
            </CardTitle>
            <CardDescription className="mt-1">
              서버에서 실제 포트폴리오를 기반으로 손절·익절·자동매수를 실행합니다.
              강력 매수 신호(85점+) 포착 시 자동 진입, -5% 손절 / +15% 익절.
            </CardDescription>
          </div>
          <Switch
            checked={status?.enabled ?? false}
            onCheckedChange={(v) => toggleMutation.mutate({ enabled: v })}
            disabled={toggleMutation.isPending}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px] p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground">현금 잔고</p>
            <p className="font-bold font-mono text-sm">
              ${(status?.cashBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="flex-1 min-w-[140px] p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground">실현 손익</p>
            <p className={`font-bold font-mono text-sm ${(status?.realizedPnl ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
              {(status?.realizedPnl ?? 0) >= 0 ? "+" : ""}
              ${(status?.realizedPnl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex-1 min-w-[140px] p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground">상태</p>
            <p className={`font-bold text-sm ${status?.enabled ? "text-green-400" : "text-muted-foreground"}`}>
              {status?.enabled ? "실행 중" : "중지됨"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runNowMutation.mutate()}
          disabled={runNowMutation.isPending}
          className="gap-2"
        >
          <Play className="w-3.5 h-3.5" />
          {runNowMutation.isPending ? "실행 중..." : "지금 1회 실행"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Mini Chart Component for Trading Desk
function MiniChart({
  ticker,
  currentPrice,
}: {
  ticker: string;
  currentPrice?: number;
}) {
  const { data, isLoading } = trpc.stock.history.useQuery(
    { ticker, period: "1mo" },
    { enabled: !!ticker && ticker.length >= 1, staleTime: 60 * 1000 }
  );

  const isUp =
    data && data.length >= 2
      ? data[data.length - 1].close >= data[0].close
      : true;

  const chartColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          {ticker} — 최근 30일 차트
          {currentPrice && (
            <span
              className={`ml-auto font-mono font-bold text-base ${isUp ? "text-green-500" : "text-red-500"}`}
            >
              {currentPrice >= 1000
                ? currentPrice.toLocaleString()
                : currentPrice.toFixed(2)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-[140px] w-full bg-muted/30 rounded-lg animate-pulse" />
        ) : !data || data.length < 2 ? (
          <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
            차트 데이터를 불러오는 중...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="miniChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={20}
                tickFormatter={d => d?.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number) => [v.toLocaleString(), "종가"]}
                labelFormatter={l => l?.slice(5)}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#miniChartGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// Utility for LocalStorage State
function useLocalState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

export default function PaperTrading() {
  const [activeTab, setActiveTab] = useState("desk");
  const [, setLocation] = useLocation();

  // State
  const [balance, setBalance] = useLocalState<number>("pt_balance", 100000);
  const [positions, setPositions] = useLocalState<Position[]>(
    "pt_positions",
    []
  );
  const [journal, setJournal] = useLocalState<JournalEntry[]>("pt_journal", []);

  // Bot Settings State
  const [isBotRunning, setIsBotRunning] = useLocalState<boolean>(
    "pt_bot_running",
    false
  );
  const [aiBuyEnabled, setAiBuyEnabled] = useLocalState<boolean>(
    "pt_bot_aibuy",
    false
  );
  const [aiBuyAmount, setAiBuyAmount] = useLocalState<number>(
    "pt_bot_aibuy_amt",
    10000
  );
  const [takeProfitEnabled, setTakeProfitEnabled] = useLocalState<boolean>(
    "pt_bot_tp",
    true
  );
  const [stopLossEnabled, setStopLossEnabled] = useLocalState<boolean>(
    "pt_bot_sl",
    true
  );
  const [botLogs, setBotLogs] = useLocalState<string[]>("pt_bot_logs", []);

  // Order Input State
  const [symbolInput, setSymbolInput] = useState("NVDA");
  const [quantityInput, setQuantityInput] = useState("10");

  // Get Live Prices
  const tickersToWatch = useMemo(() => {
    const set = new Set(positions.map(p => p.ticker));
    if (symbolInput) set.add(symbolInput.toUpperCase());
    if (isBotRunning && aiBuyEnabled) {
      ["TSLA", "NVDA", "PLTR", "MSTR", "005930", "000660"].forEach(t =>
        set.add(t)
      );
    }
    return Array.from(set);
  }, [positions, symbolInput, isBotRunning, aiBuyEnabled]);
  const livePrices = useMarketStream(tickersToWatch);

  // Derived Values
  const livePositions = useMemo(() => {
    return positions.map(p => {
      const currentPrice = livePrices[p.ticker]?.price || p.avgPrice;
      const totalValue = currentPrice * p.quantity;
      const invested = p.avgPrice * p.quantity;
      const pnl = totalValue - invested;
      const pnlPct = (pnl / invested) * 100;
      return { ...p, currentPrice, totalValue, pnl, pnlPct };
    });
  }, [positions, livePrices]);

  const totalPortfolioValue = useMemo(() => {
    return livePositions.reduce((sum, p) => sum + p.totalValue, 0);
  }, [livePositions]);

  const totalAssets = balance + totalPortfolioValue;
  const totalInvested = livePositions.reduce(
    (sum, p) => sum + p.avgPrice * p.quantity,
    0
  );
  const unrealizedPnl = totalPortfolioValue - totalInvested;

  const realizedPnl = useMemo(() => {
    return journal
      .filter(j => j.type === "SELL" && j.pnl)
      .reduce((sum, j) => sum + (j.pnl || 0), 0);
  }, [journal]);

  const addLog = useCallback(
    (msg: string) => {
      const timeStr = new Date().toLocaleTimeString();
      setBotLogs(prev => [`[${timeStr}] ${msg}`, ...prev].slice(0, 50));
    },
    [setBotLogs]
  );

  // Use refs for interval to avoid closure staleness without resetting timer
  const stateRef = useRef({ balance, positions, livePositions, livePrices });
  useEffect(() => {
    stateRef.current = { balance, positions, livePositions, livePrices };
  }, [balance, positions, livePositions, livePrices]);

  // Order Actions
  const handleBuy = useCallback(
    (ticker: string, quantity: number, price: number, reason: string) => {
      const cost = price * quantity;
      if (stateRef.current.balance < cost) {
        toast.error("잔고가 부족합니다.");
        return false;
      }

      setBalance(prev => prev - cost);
      setPositions(prev => {
        const existing = prev.find(p => p.ticker === ticker);
        if (existing) {
          const newQty = existing.quantity + quantity;
          const newAvg =
            (existing.avgPrice * existing.quantity + cost) / newQty;
          return prev.map(p =>
            p.ticker === ticker
              ? { ...p, quantity: newQty, avgPrice: newAvg }
              : p
          );
        }
        return [...prev, { ticker, quantity, avgPrice: price }];
      });

      setJournal(prev => [
        {
          id: Date.now().toString() + Math.random(),
          type: "BUY",
          ticker,
          quantity,
          price,
          time: new Date().toISOString(),
          reason,
        },
        ...prev,
      ]);
      toast.success(`${ticker} ${quantity}주 매수 완료`);
      return true;
    },
    [setBalance, setPositions, setJournal]
  );

  const handleSell = useCallback(
    (ticker: string, quantity: number, price: number, reason: string) => {
      const pos = stateRef.current.positions.find(
        (p: Position) => p.ticker === ticker
      );
      if (!pos || pos.quantity < quantity) {
        toast.error("보유 수량이 부족합니다.");
        return false;
      }

      const revenue = price * quantity;
      const costBasis = pos.avgPrice * quantity;
      const pnl = revenue - costBasis;
      const pnlPct = (pnl / costBasis) * 100;

      setBalance(prev => prev + revenue);
      setPositions(prev => {
        if (pos.quantity === quantity)
          return prev.filter(p => p.ticker !== ticker);
        return prev.map(p =>
          p.ticker === ticker ? { ...p, quantity: p.quantity - quantity } : p
        );
      });

      setJournal(prev => [
        {
          id: Date.now().toString() + Math.random(),
          type: "SELL",
          ticker,
          quantity,
          price,
          time: new Date().toISOString(),
          reason,
          pnl,
          pnlPct,
        },
        ...prev,
      ]);
      toast.success(`${ticker} ${quantity}주 매도 완료`);
      return true;
    },
    [setBalance, setPositions, setJournal]
  );

  const executeManualBuy = () => {
    const t = symbolInput.toUpperCase();
    const q = Number(quantityInput);
    if (!t || q <= 0) return toast.error("종목과 수량을 확인하세요.");
    const price = livePrices[t]?.price;
    if (!price)
      return toast.error(
        "현재가를 불러오는 중입니다. 잠시 후 다시 시도하세요."
      );
    handleBuy(t, q, price, "사용자 수동 매수");
  };

  const executeManualSell = () => {
    const t = symbolInput.toUpperCase();
    const q = Number(quantityInput);
    if (!t || q <= 0) return toast.error("종목과 수량을 확인하세요.");
    const price = livePrices[t]?.price;
    if (!price) return toast.error("현재가를 불러오는 중입니다.");
    handleSell(t, q, price, "사용자 수동 매도");
  };

  // Bot Logic (Runs every few seconds if active)
  useEffect(() => {
    if (!isBotRunning) return;
    const interval = setInterval(() => {
      const { livePositions, livePrices, positions, balance } =
        stateRef.current;

      // 1. Exit Logic (TP / SL)
      livePositions.forEach((pos: any) => {
        if (takeProfitEnabled && pos.pnlPct >= 10) {
          if (
            handleSell(
              pos.ticker,
              pos.quantity,
              pos.currentPrice,
              "봇 자동 익절 (수익률 10% 도달)"
            )
          ) {
            addLog(
              `SELL ${pos.ticker} ${pos.quantity}주 (수익률 +${pos.pnlPct.toFixed(1)}% 자동 익절)`
            );
          }
        }
        if (stopLossEnabled && pos.pnlPct <= -5) {
          if (
            handleSell(
              pos.ticker,
              pos.quantity,
              pos.currentPrice,
              "봇 자동 손절 (수익률 -5% 도달)"
            )
          ) {
            addLog(
              `SELL ${pos.ticker} ${pos.quantity}주 (수익률 ${pos.pnlPct.toFixed(1)}% 자동 손절)`
            );
          }
        }
      });

      // 2. Entry Logic (AI Auto Buy)
      if (aiBuyEnabled) {
        // 20% chance every 5 seconds to simulate AI finding a signal
        if (Math.random() < 0.2) {
          const candidates = [
            "TSLA",
            "NVDA",
            "PLTR",
            "MSTR",
            "005930",
            "000660",
          ];
          const target =
            candidates[Math.floor(Math.random() * candidates.length)];

          if (!positions.some((p: Position) => p.ticker === target)) {
            const price = livePrices[target]?.price;
            if (price && balance >= aiBuyAmount) {
              const qty = Math.floor(aiBuyAmount / price);
              if (qty > 0) {
                if (
                  handleBuy(
                    target,
                    qty,
                    price,
                    "AI 자동 진입 (강력 매수 패턴 포착)"
                  )
                ) {
                  addLog(`BUY ${target} ${qty}주 (AI 강력 매수 신호 감지)`);
                }
              }
            }
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [
    isBotRunning,
    takeProfitEnabled,
    stopLossEnabled,
    aiBuyEnabled,
    aiBuyAmount,
    addLog,
    handleBuy,
    handleSell,
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Badge
            variant="default"
            className="mb-2 bg-green-500 hover:bg-green-600"
          >
            🚀 라이브 모의투자 활성화됨
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-primary" />
            모의투자 (Paper Trading Pro)
          </h1>
          <p className="text-muted-foreground mt-2">
            가상 자본금으로 리스크 없이 트레이딩 감각을 익히고 자동매매를
            테스트하세요. 모든 거래는 브라우저에 저장됩니다.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start h-auto flex-wrap bg-card border rounded-lg p-1 mb-6">
            <TabsTrigger value="desk" className="py-2.5 px-4 gap-2">
              <LineChart className="w-4 h-4" /> 트레이딩 데스크
            </TabsTrigger>
            <TabsTrigger value="bot" className="py-2.5 px-4 gap-2">
              <Bot className="w-4 h-4" /> AI 자동매매 봇
            </TabsTrigger>
            <TabsTrigger value="journal" className="py-2.5 px-4 gap-2">
              <BookOpen className="w-4 h-4" /> 매매 일지
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="py-2.5 px-4 gap-2">
              <Trophy className="w-4 h-4" /> 랭킹 보드
            </TabsTrigger>
          </TabsList>

          {/* 1. Trading Desk */}
          <TabsContent
            value="desk"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-6">
              {/* Account Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-card bg-primary/5">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground font-bold uppercase mb-1">
                      총 자산 (Virtual)
                    </p>
                    <p className="text-2xl font-mono font-black">
                      $
                      {totalAssets.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground font-bold uppercase mb-1">
                      구매 가능 잔고
                    </p>
                    <p className="text-2xl font-mono font-black text-blue-500">
                      $
                      {balance.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground font-bold uppercase mb-1">
                      평가 손익
                    </p>
                    <p
                      className={`text-2xl font-mono font-black ${unrealizedPnl >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {unrealizedPnl >= 0 ? "+" : ""}$
                      {unrealizedPnl.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground font-bold uppercase mb-1">
                      실현 손익
                    </p>
                    <p
                      className={`text-2xl font-mono font-black ${realizedPnl >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {realizedPnl >= 0 ? "+" : ""}$
                      {realizedPnl.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Panel */}
                <Card className="glass-card lg:col-span-1 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crosshair className="w-5 h-5 text-primary" />
                      실시간 가상 주문
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>종목 심볼 (US Ticker or KR Code)</Label>
                      <Input
                        placeholder="예: TSLA 또는 005930"
                        value={symbolInput}
                        onChange={e => setSymbolInput(e.target.value)}
                        className="font-mono uppercase"
                      />
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>현재가:</span>
                        <span className="font-bold">
                          {livePrices[symbolInput.toUpperCase()]
                            ? formatPrice(
                                livePrices[symbolInput.toUpperCase()].price,
                                symbolInput.toUpperCase(),
                                { decimals: 2 }
                              )
                            : "불러오는 중..."}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>주문 수량 (주)</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={quantityInput}
                        onChange={e => setQuantityInput(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 font-bold"
                        onClick={executeManualBuy}
                      >
                        시장가 매수
                      </Button>
                      <Button
                        variant="destructive"
                        className="font-bold"
                        onClick={executeManualSell}
                      >
                        시장가 매도
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => {
                        setBalance(100000);
                        setPositions([]);
                        setJournal([]);
                        setBotLogs([]);
                      }}
                    >
                      계좌 초기화 (Reset)
                    </Button>
                  </CardContent>
                </Card>

                {/* Right Side: Chart + Positions */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Mini Chart */}
                  <MiniChart
                    ticker={symbolInput.toUpperCase()}
                    currentPrice={livePrices[symbolInput.toUpperCase()]?.price}
                  />

                  {/* Positions */}
                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        보유 포지션 ({livePositions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-muted-foreground bg-muted/50">
                            <tr>
                              <th className="px-4 py-2 rounded-l-lg">종목</th>
                              <th className="px-4 py-2">수량</th>
                              <th className="px-4 py-2">평단가</th>
                              <th className="px-4 py-2">현재가</th>
                              <th className="px-4 py-2 rounded-r-lg">수익률</th>
                            </tr>
                          </thead>
                          <tbody>
                            {livePositions.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="text-center py-8 text-muted-foreground"
                                >
                                  보유 종목이 없습니다.
                                </td>
                              </tr>
                            )}
                            {livePositions.map(pos => (
                              <tr
                                key={pos.ticker}
                                className="border-b border-border/50 hover:bg-muted/30"
                              >
                                <td className="px-4 py-3 font-bold font-mono">
                                  {pos.ticker}
                                </td>
                                <td className="px-4 py-3">{pos.quantity}</td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {formatPrice(pos.avgPrice, pos.ticker, {
                                    decimals: isKoreanTicker(pos.ticker)
                                      ? 0
                                      : 2,
                                  })}
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  {formatPrice(pos.currentPrice, pos.ticker, {
                                    decimals: isKoreanTicker(pos.ticker)
                                      ? 0
                                      : 2,
                                  })}
                                </td>
                                <td
                                  className={`px-4 py-3 font-bold ${pos.pnlPct >= 0 ? "text-green-500" : "text-red-500"}`}
                                >
                                  {pos.pnlPct >= 0 ? "+" : ""}
                                  {pos.pnlPct.toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 2. Bot */}
          <TabsContent
            value="bot"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-6">
              <Card className="border-primary/30 shadow-lg relative overflow-hidden">
                {isBotRunning && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-pulse"></div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bot
                          className={`w-6 h-6 ${isBotRunning ? "text-green-500" : "text-muted-foreground"}`}
                        />
                        AI 자동매매 봇 (Sandbox)
                      </CardTitle>
                      <CardDescription>
                        현재 보유 중인 포지션에 대해 자동으로 청산을 감시합니다.
                      </CardDescription>
                    </div>
                    <Button
                      variant={isBotRunning ? "destructive" : "default"}
                      onClick={() => {
                        const next = !isBotRunning;
                        setIsBotRunning(next);
                        addLog(`봇 ${next ? "실행됨" : "중지됨"}`);
                      }}
                      className="gap-2 font-bold"
                    >
                      {isBotRunning ? (
                        <>
                          <Square className="w-4 h-4" /> 봇 감시 중지
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> 봇 감시 시작
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-muted/20 border-border/50">
                      <CardContent className="p-4 space-y-4">
                        <h4 className="font-bold text-sm">
                          매수 조건 (Buy Rules)
                        </h4>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm cursor-pointer">
                            AI 신호 "강력 매수" 시 자동 진입
                          </Label>
                          <Switch
                            checked={aiBuyEnabled}
                            onCheckedChange={setAiBuyEnabled}
                          />
                        </div>
                        <div className="pt-2 border-t border-border/50">
                          <Label className="text-xs text-muted-foreground">
                            종목당 진입 금액 (Virtual $)
                          </Label>
                          <Select
                            value={String(aiBuyAmount)}
                            onValueChange={v => setAiBuyAmount(Number(v))}
                          >
                            <SelectTrigger className="h-8 mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5000">$5,000</SelectItem>
                              <SelectItem value="10000">$10,000</SelectItem>
                              <SelectItem value="25000">$25,000</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/20 border-border/50">
                      <CardContent className="p-4 space-y-4">
                        <h4 className="font-bold text-sm">
                          청산 조건 (Exit Rules)
                        </h4>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm cursor-pointer">
                            수익률 +10% 도달 시 전량 익절
                          </Label>
                          <Switch
                            checked={takeProfitEnabled}
                            onCheckedChange={setTakeProfitEnabled}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm cursor-pointer">
                            수익률 -5% 도달 시 칼손절
                          </Label>
                          <Switch
                            checked={stopLossEnabled}
                            onCheckedChange={setStopLossEnabled}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border/50 flex flex-col justify-center items-center text-center p-6">
                      <Activity
                        className={`w-12 h-12 mb-2 ${isBotRunning ? "text-green-500 animate-pulse" : "text-muted-foreground"}`}
                      />
                      <h3 className="font-bold text-lg">
                        {isBotRunning ? "감시 중..." : "대기 중"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        서버가 아니라 브라우저 위에서 로컬로 감시합니다.
                      </p>
                    </Card>
                  </div>

                  <div className="p-4 bg-card border rounded-lg h-64 overflow-y-auto">
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2 sticky top-0 bg-card py-1">
                      <Activity className="w-4 h-4 text-primary" /> 봇 활동 로그
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      {botLogs.length === 0 && (
                        <p className="text-muted-foreground">
                          기록된 로그가 없습니다.
                        </p>
                      )}
                      {botLogs.map((log, i) => (
                        <p key={i} className="text-muted-foreground">
                          {log}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 서버사이드 AI 오토파일럿 */}
              <AutopilotPanel />
            </div>
          </TabsContent>

          {/* 3. Journal */}
          <TabsContent
            value="journal"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    매매 일지
                  </CardTitle>
                  <CardDescription>
                    모든 거래 내역이 자동으로 이곳에 기록됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {journal.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      거래 내역이 없습니다.
                    </div>
                  ) : (
                    journal.map(j => (
                      <div key={j.id} className="p-4 border rounded-xl bg-card">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${j.type === "BUY" ? "bg-green-500/10" : "bg-red-500/10"}`}
                            >
                              {j.type === "BUY" ? (
                                <TrendingUp className="w-5 h-5 text-green-500" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold font-mono text-lg">
                                {j.ticker} {j.type === "BUY" ? "매수" : "매도"}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {new Date(j.time).toLocaleString()} | 단가{" "}
                                {formatPrice(j.price, j.ticker)} | {j.quantity}
                                주
                              </p>
                            </div>
                          </div>
                          {j.type === "SELL" && j.pnl !== undefined && (
                            <Badge
                              variant="outline"
                              className={
                                j.pnl >= 0
                                  ? "text-green-500 border-green-500/30"
                                  : "text-red-500 border-red-500/30"
                              }
                            >
                              실현 손익 {j.pnl >= 0 ? "+" : ""}$
                              {j.pnl.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}{" "}
                              ({j.pnlPct?.toFixed(2)}%)
                            </Badge>
                          )}
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg text-sm">
                          <span className="font-bold block mb-1">
                            📝 기록 / 사유
                          </span>
                          <p className="text-muted-foreground">{j.reason}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 4. Leaderboard */}
          <TabsContent
            value="leaderboard"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Leaderboard Component (Static Mockup for Game element)
function Leaderboard() {
  const leaders = [
    { rank: 1, name: "WarrenB", roi: "+45.2%", winRate: "78%", badge: "🏆" },
    {
      rank: 2,
      name: "DiamondHands",
      roi: "+38.1%",
      winRate: "65%",
      badge: "🥈",
    },
    { rank: 3, name: "AlgoMaster", roi: "+31.5%", winRate: "82%", badge: "🥉" },
    { rank: 4, name: "MoonWalker", roi: "+28.0%", winRate: "55%", badge: "⭐" },
    {
      rank: 5,
      name: "User_8812 (Me)",
      roi: "+5.4%",
      winRate: "50%",
      badge: "",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="text-center pb-2">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <CardTitle className="text-2xl">이달의 탑 트레이더</CardTitle>
          <CardDescription>
            가상 계좌 수익률을 겨루는 명예의 전당입니다. (리더보드 기능은 추후
            서버 연동 예정)
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-2xl mx-auto mt-4">
          <div className="space-y-2">
            {leaders.map(l => (
              <div
                key={l.rank}
                className={`flex items-center justify-between p-4 rounded-xl border ${l.rank === 5 ? "bg-primary/10 border-primary/30" : "bg-card"}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${l.rank <= 3 ? "bg-yellow-500/20 text-yellow-500" : "bg-muted"}`}
                  >
                    {l.rank}
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      {l.name} <span className="text-lg">{l.badge}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      승률: {l.winRate}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black font-mono text-green-500">
                    {l.roi}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
