import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";

import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Edit2,
  ExternalLink,
  BarChart3,
  ArrowUpDown,
  Filter,
  Star,
  Camera,
  History as HistoryIcon,
  Globe2,
  BrainCircuit,
} from "lucide-react";
import { useMarketStream } from "@/hooks/useMarketStream";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PortfolioRiskAnalysis from "@/components/PortfolioRiskAnalysis";
import CorrelationMatrix from "@/components/CorrelationMatrix";
import PortfolioSimulator from "@/components/PortfolioSimulator";
import FundamentalSummary from "@/components/FundamentalSummary";
import MacroContext from "@/components/MacroContext";
import AIPortfolioAdvisor from "@/components/AIPortfolioAdvisor";
import PortfolioSectorChart from "@/components/PortfolioSectorChart";
import DividendCalendar from "@/components/DividendCalendar";
import PortfolioStressTest from "@/components/PortfolioStressTest";
import TaxEstimator from "@/components/TaxEstimator";
import AssetAllocationAdvisor from "@/components/AssetAllocationAdvisor";
import PortfolioTimeline from "@/components/PortfolioTimeline";
import SectorConcentrationAlert from "@/components/SectorConcentrationAlert";
import MarketCountdown from "@/components/MarketCountdown";
import DailyTopPicksWidget from "@/components/DailyTopPicksWidget";
import AutoPilotWidget from "@/components/AutoPilotWidget";
import PortfolioHealthCheck from "@/components/PortfolioHealthCheck";
import {
  formatPrice,
  resolveCurrencySymbol,
  isKoreanTicker,
} from "@/lib/currency";

// 수수료/세금 계산 유틸리티
function calcFees(ticker: string, price: number, qty: number) {
  const isKR = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
  const total = price * qty;
  if (isKR) {
    const commission = total * 0.00015;
    const secTax = total * 0.002;
    return {
      commission: Math.round(commission),
      tax: Math.round(secTax),
      total: Math.round(total),
      net: Math.round(total + commission + secTax),
      isKR,
    };
  } else {
    const secFee = total * 0.0000278;
    return {
      commission: 0,
      tax: Math.round(secFee * 10000) / 10000,
      total: Math.round(total * 100) / 100,
      net: Math.round((total + secFee) * 100) / 100,
      isKR: false,
    };
  }
}

const PIE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a78bfa",
  "#60a5fa",
  "#f97316",
  "#14b8a6",
  "#e879f9",
  "#fb7185",
];

interface AddPositionForm {
  ticker: string;
  name: string;
  quantity: string;
  avgPrice: string;
  memo: string;
}
const defaultForm: AddPositionForm = {
  ticker: "",
  name: "",
  quantity: "",
  avgPrice: "",
  memo: "",
};

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [form, setForm] = useState<AddPositionForm>(defaultForm);
  const [sellForm, setSellForm] = useState<{ quantity: string; price: string }>(
    { quantity: "", price: "" }
  );
  const [sortBy, setSortBy] = useState<
    "pnlPct" | "ticker" | "totalValue" | "addedAt" | "score"
  >("addedAt");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filterType, setFilterType] = useState<"all" | "profit" | "loss">(
    "all"
  );
  const [marketFilter, setMarketFilter] = useState<"all" | "us" | "kr">("all");

  const utils = trpc.useUtils();
  const { data: portfolioData, isLoading } = trpc.portfolio.list.useQuery(
    undefined,
    { refetchInterval: 10 * 1000 }
  );
  const positions = portfolioData?.positions ?? [];
  const cashBalance = portfolioData?.cashBalance ?? 100000;
  const realizedPnl = portfolioData?.realizedPnl ?? 0;
  const krwBalance = portfolioData?.krwBalance ?? 30000000;
  const realizedPnlKrw = portfolioData?.realizedPnlKrw ?? 0;

  const { data: snapHistory = [] } = trpc.portfolio.snapHistory.useQuery();
  const { data: watchlistData } = trpc.watchlist.list.useQuery();
  const { data: watchlistSummaries } = trpc.stock.batchSummary.useQuery(
    { tickers: (watchlistData ?? []).map(w => w.ticker) },
    { enabled: (watchlistData ?? []).length > 0 }
  );

  const tickers = useMemo(() => positions.map(p => p.ticker), [positions]);
  const realtimePrices = useMarketStream(tickers);

  // USD/KRW 환율 실시간 조회
  const { data: macroIndices } = trpc.macro.indices.useQuery(undefined, {
    refetchInterval: 60 * 1000,
    staleTime: 55 * 1000,
  });
  const usdKrwRate = useMemo(() => {
    const krwItem = macroIndices?.find((m: any) => m.ticker === "KRW=X");
    return krwItem?.price ?? 1380; // 기본값 1,380원
  }, [macroIndices]);

  // 실시간 가격 반영된 positions
  const livePositions = useMemo(
    () =>
      positions.map(p => {
        const rt = realtimePrices[p.ticker];
        const currentPrice = rt?.price ?? p.currentPrice ?? 0;
        const avgPrice = Number(p.avgPrice);
        const quantity = Number(p.quantity);
        const pnl =
          currentPrice > 0
            ? (currentPrice - avgPrice) * quantity
            : (p.pnl ?? 0);
        const pnlPct =
          currentPrice > 0 && avgPrice > 0
            ? ((currentPrice - avgPrice) / avgPrice) * 100
            : (p.pnlPct ?? 0);
        return {
          ...p,
          currentPrice,
          pnl,
          pnlPct,
          totalValue: currentPrice * quantity,
        };
      }),
    [positions, realtimePrices]
  );

  const saveSnapshotMutation = trpc.portfolio.saveSnapshot.useMutation();

  const buyMutation = trpc.portfolio.buy.useMutation({
    onSuccess: () => {
      utils.portfolio.list.invalidate();
      setAddOpen(false);
      setForm(defaultForm);
      toast.success(`${form.ticker.toUpperCase()} 매수가 완료되었습니다.`);
    },
    onError: e => toast.error(e.message),
  });

  const sellMutation = trpc.portfolio.sell.useMutation({
    onSuccess: () => {
      utils.portfolio.list.invalidate();
      setSellOpen(false);
      toast.success("매도가 완료되었습니다.");
    },
    onError: e => toast.error(e.message),
  });

  const handleBuy = () => {
    if (!form.ticker || !form.quantity || !form.avgPrice) {
      toast.error("티커, 수량, 매수가는 필수입니다.");
      return;
    }
    buyMutation.mutate({
      ticker: form.ticker.toUpperCase(),
      name: form.name || undefined,
      quantity: Number(form.quantity),
      price: Number(form.avgPrice),
      memo: form.memo || undefined,
    });
  };

  const handleSell = () => {
    if (!selectedTicker || !sellForm.quantity || !sellForm.price) {
      toast.error("수량과 가격을 입력하세요.");
      return;
    }
    sellMutation.mutate({
      ticker: selectedTicker,
      quantity: Number(sellForm.quantity),
      price: Number(sellForm.price),
    });
  };

  const usPositions = livePositions.filter(p => p.currency === "USD");
  const krPositions = livePositions.filter(p => p.currency === "KRW");

  const totalInvestedUsd = usPositions.reduce((sum, p) => sum + Number(p.avgPrice) * Number(p.quantity), 0);
  const totalValueUsd = usPositions.reduce((sum, p) => sum + (p.totalValue ?? 0), 0);
  const totalPnlUsd = totalValueUsd - totalInvestedUsd;
  const totalPnlPctUsd = totalInvestedUsd > 0 ? (totalPnlUsd / totalInvestedUsd) * 100 : 0;

  const totalInvestedKrw = krPositions.reduce((sum, p) => sum + Number(p.avgPrice) * Number(p.quantity), 0);
  const totalValueKrw = krPositions.reduce((sum, p) => sum + (p.totalValue ?? 0), 0);
  const totalPnlKrw = totalValueKrw - totalInvestedKrw;
  const totalPnlPctKrw = totalInvestedKrw > 0 ? (totalPnlKrw / totalInvestedKrw) * 100 : 0;

  // 스냅샷용 전체 합산 (USD 환산)
  const totalInvested = totalInvestedUsd + (totalInvestedKrw / (usdKrwRate || 1380));
  const totalValue = totalValueUsd + (totalValueKrw / (usdKrwRate || 1380));
  const totalPnlPct = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  // 스냅샷 저장
  useEffect(() => {
    if (livePositions.length === 0 || totalValue === 0) return;
    const timer = setTimeout(() => {
      saveSnapshotMutation.mutate({
        totalValue,
        totalInvested,
        pnlPercent: totalPnlPct,
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [totalValue > 0]);

  const sortedPositions = useMemo(() => {
    let filtered = [...livePositions];

    // 마켓 필터
    if (marketFilter !== "all") {
      filtered = filtered.filter(p => {
        const isKR = p.ticker.endsWith(".KS") || p.ticker.endsWith(".KQ");
        return marketFilter === "kr" ? isKR : !isKR;
      });
    }

    if (filterType === "profit")
      filtered = filtered.filter(p => (p.pnl ?? 0) > 0);
    if (filterType === "loss")
      filtered = filtered.filter(p => (p.pnl ?? 0) < 0);

    return filtered.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortBy === "pnlPct") {
        valA = a.pnlPct;
        valB = b.pnlPct;
      } else if (sortBy === "ticker") {
        valA = a.ticker;
        valB = b.ticker;
      } else if (sortBy === "totalValue") {
        valA = a.totalValue;
        valB = b.totalValue;
      } else if (sortBy === "score") {
        valA = (a as any).entrySignalScore ?? 0;
        valB = (b as any).entrySignalScore ?? 0;
      } else {
        valA = new Date(a.addedAt ?? 0).getTime();
        valB = new Date(b.addedAt ?? 0).getTime();
      }

      if (typeof valA === "string")
        return sortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }, [livePositions, sortBy, sortDir, filterType, marketFilter]);

  const watchlistNotInPortfolio = useMemo(() => {
    const portfolioTickers = new Set(
      livePositions.map(p => p.ticker.toUpperCase())
    );
    return (watchlistSummaries ?? []).filter(
      s => !portfolioTickers.has(s.ticker.toUpperCase())
    );
  }, [livePositions, watchlistSummaries]);

  // 도넛 차트 데이터
  const pieData = useMemo(
    () =>
      livePositions
        .filter(p => (p.totalValue ?? 0) > 0)
        .map(p => ({ name: p.ticker, value: p.totalValue ?? 0 }))
        .sort((a, b) => b.value - a.value),
    [livePositions]
  );

  // 스냅샷 차트 데이터
  const snapChartData = useMemo(
    () =>
      [...snapHistory].reverse().map(s => ({
        date: s.snapshotDate.slice(5),
        value: s.totalValue,
        pnl: s.pnlPercent,
      })),
    [snapHistory]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 장 개장 카운트다운 & 오늘의 TOP 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <MarketCountdown />
          </div>
          <div className="lg:col-span-2">
            <Card className="glass-card premium-border h-full">
              <CardContent className="p-4 h-full flex items-center">
                <DailyTopPicksWidget />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" />
              AI 모의투자 대시보드
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              자본금을 활용하여 실제 시장 가격으로 매수/매도 테스트를
              진행하세요.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                미국주식 예수금
              </p>
              <p className="text-lg font-black font-mono text-primary">
                ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                한국주식 예수금
              </p>
              <p className="text-lg font-black font-mono text-primary">
                ₩{krwBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-bull hover:bg-bull/90">
                  <Plus className="w-4 h-4" />
                  신규 매수
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>주식 매수</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">매수 가능 달러 (USD)</p>
                      <p className="text-lg font-black font-mono text-primary">
                        ${cashBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">매수 가능 원화 (KRW)</p>
                      <p className="text-lg font-black font-mono text-primary">
                        ₩{krwBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>티커 *</Label>
                      <Input
                        placeholder="AAPL"
                        value={form.ticker}
                        onChange={e =>
                          setForm({
                            ...form,
                            ticker: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>종목명</Label>
                      <Input
                        placeholder="Apple Inc."
                        value={form.name}
                        onChange={e =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>수량 *</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={form.quantity}
                        onChange={e =>
                          setForm({ ...form, quantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>매수가 *</Label>
                      <Input
                        type="number"
                        placeholder="150.00"
                        value={form.avgPrice}
                        onChange={e =>
                          setForm({ ...form, avgPrice: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        총 주문 금액
                      </span>
                      <span className="font-bold text-primary">
                        $
                        {(
                          Number(form.quantity || 0) *
                          Number(form.avgPrice || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {form.quantity &&
                    form.avgPrice &&
                    form.ticker &&
                    (() => {
                      const fees = calcFees(
                        form.ticker,
                        Number(form.avgPrice),
                        Number(form.quantity)
                      );
                      return (
                        <div className="p-3 bg-muted/20 rounded-lg border border-border/40 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              수수료 ({fees.isKR ? "0.015%" : "무료"})
                            </span>
                            <span className="font-mono">
                              {fees.isKR
                                ? `₩${fees.commission.toLocaleString()}`
                                : "$0.00"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {fees.isKR ? "증권거래세 (0.2%)" : "SEC 기로액"}
                            </span>
                            <span className="font-mono">
                              {fees.isKR
                                ? `₩${fees.tax.toLocaleString()}`
                                : `$${fees.tax.toFixed(4)}`}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-border/30 pt-1.5 text-sm">
                            <span>실제 거래 총액</span>
                            <span className="text-primary font-black">
                              {fees.isKR
                                ? `₩${fees.net.toLocaleString()}`
                                : `$${fees.net.toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  <Button
                    className="w-full bg-bull hover:bg-bull/90"
                    onClick={handleBuy}
                    disabled={buyMutation.isPending}
                  >
                    {buyMutation.isPending ? "주문 처리 중..." : "매수 주문"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI 오토파일럿 제어 */}
        <AutoPilotWidget />

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                누적 실현 손익
              </p>
              <div className="space-y-1 mt-1">
                <p className={`text-xl font-black font-mono ${realizedPnl >= 0 ? "text-bull" : "text-bear"}`}>
                  {realizedPnl >= 0 ? "+" : ""}${realizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-sm font-bold font-mono ${realizedPnlKrw >= 0 ? "text-bull" : "text-bear"}`}>
                  {realizedPnlKrw >= 0 ? "+" : ""}₩{realizedPnlKrw.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                총 투자 원금
              </p>
              <div className="space-y-1 mt-1">
                <p className="text-xl font-black font-mono">${totalInvestedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-sm font-bold font-mono text-muted-foreground">₩{totalInvestedKrw.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                현재 평가 자산
              </p>
              <div className="space-y-1 mt-1">
                <p className="text-xl font-black font-mono">${totalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-sm font-bold font-mono text-muted-foreground">₩{totalValueKrw.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                미실현 수익률
              </p>
              <div className="space-y-1 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-bold w-6">USD</span>
                  <span className={`text-lg font-black font-mono ${totalPnlUsd >= 0 ? "text-bull" : "text-bear"}`}>
                    {totalPnlUsd >= 0 ? "+" : ""}{totalPnlPctUsd.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-bold w-6">KRW</span>
                  <span className={`text-sm font-bold font-mono ${totalPnlKrw >= 0 ? "text-bull" : "text-bear"}`}>
                    {totalPnlKrw >= 0 ? "+" : ""}{totalPnlPctKrw.toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PortfolioHealthCheck />
            <AIPortfolioAdvisor />

            {/* 정렬/필터 툴바 */}
            <div className="glass-card p-2 rounded-2xl premium-border mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex bg-muted/30 p-1 rounded-xl w-full sm:w-auto">
                {[
                  { id: "all", label: "전체 포트폴리오", icon: Wallet },
                  { id: "us", label: "미국 주식", icon: Globe2 },
                  { id: "kr", label: "한국 주식", icon: Globe2 },
                ].map(m => (
                  <Button
                    key={m.id}
                    variant={marketFilter === m.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setMarketFilter(m.id as any)}
                    className={`flex-1 sm:flex-none px-4 h-9 text-xs gap-2 font-bold transition-all ${
                      marketFilter === m.id
                        ? "bg-primary/15 text-primary hover:bg-primary/20 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2 hidden md:block">
                  정렬 기준
                </span>
                {[
                  { id: "score", label: "AI 점수", icon: BrainCircuit },
                  { id: "pnlPct", label: "수익률", icon: TrendingUp },
                  { id: "totalValue", label: "비중", icon: BarChart3 },
                ].map(s => (
                  <Button
                    key={s.id}
                    variant={sortBy === s.id ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (sortBy === s.id)
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else {
                        setSortBy(s.id as any);
                        setSortDir("desc");
                      }
                    }}
                    className={`h-8 text-[11px] gap-1.5 font-semibold px-3 ${
                      sortBy === s.id
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "text-muted-foreground border-border/40"
                    }`}
                  >
                    <s.icon className="w-3 h-3" />
                    {s.label}
                    {sortBy === s.id && (
                      <span className="text-[10px] ml-0.5 opacity-60">
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* 포지션 리스트 */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-24 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : livePositions.length === 0 ? (
              <Card className="border-dashed py-12">
                <CardContent className="flex flex-col items-center justify-center gap-4">
                  <Wallet className="w-12 h-12 text-muted-foreground/30" />
                  <div className="text-center">
                    <p className="font-bold text-muted-foreground">
                      활성 포지션이 없습니다
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      보유 현금을 사용하여 첫 매수를 시작해보세요.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />첫 종목 매수하기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sortedPositions.map(pos => {
                  const isProfit = (pos.pnl ?? 0) >= 0;
                  return (
                    <Card
                      key={pos.id}
                      className="group hover:border-primary/30 transition-all duration-300"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isProfit ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}
                            >
                              {pos.ticker.slice(0, 3)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm">
                                  {pos.ticker}
                                </span>
                                {pos.name && (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                    {pos.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                <span className="font-bold">
                                  {Number(pos.quantity).toLocaleString()}주
                                </span>{" "}
                                ·{" "}
                                <span className="font-mono">
                                  Avg {pos.currencySymbol}
                                  {Number(pos.avgPrice).toLocaleString()}
                                </span>
                                {pos.entrySignalScore != null && (
                                  <>
                                    {" "}
                                    ·{" "}
                                    <span className="text-emerald-500 font-bold">
                                      AI: {pos.entrySignalScore}pt
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 shrink-0">
                            {/* 리스크 감시 (손절/익절) */}
                            <div className="hidden xl:flex flex-col gap-1 w-32">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-bear">SL -5%</span>
                                <span className="text-bull">TP +15%</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                <div 
                                  className="h-full bg-bear transition-all duration-500" 
                                  style={{ width: `${Math.max(0, Math.min(100, (5 + pos.pnlPct) * 5))}%` }}
                                />
                                <div 
                                  className="h-full bg-bull transition-all duration-500" 
                                  style={{ width: `${Math.max(0, Math.min(100, (pos.pnlPct) * 3.33))}%` }}
                                />
                              </div>
                              <div className="text-[9px] text-center text-muted-foreground font-medium">
                                {pos.pnlPct <= -4 ? "⚠️ 손절 임박" : pos.pnlPct >= 12 ? "🚀 익절 임박" : "🛡️ AI 감시 중"}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-black font-mono">
                                {pos.currentPrice > 0
                                  ? `${pos.currencySymbol}${pos.currentPrice.toLocaleString()}`
                                  : "—"}
                              </div>
                              <div
                                className={`text-[11px] font-bold ${isProfit ? "text-bull" : "text-bear"}`}
                              >
                                {isProfit ? "▲" : "▼"}{" "}
                                {Math.abs(pos.pnlPct ?? 0).toFixed(2)}%
                              </div>
                            </div>

                            <div className="text-right hidden sm:block w-24">
                              <div className="text-sm font-black font-mono">
                                {pos.currencySymbol}
                                {(pos.totalValue ?? 0).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 0 }
                                )}
                              </div>
                              <div
                                className={`text-[10px] font-bold ${isProfit ? "text-bull" : "text-bear"}`}
                              >
                                {isProfit ? "+" : ""}
                                {pos.currencySymbol}
                                {(pos.pnl ?? 0).toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </div>
                            </div>

                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-bull/10 hover:text-bull"
                                onClick={() => {
                                  setForm({
                                    ...defaultForm,
                                    ticker: pos.ticker,
                                    avgPrice: String(pos.currentPrice),
                                  });
                                  setAddOpen(true);
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-bear/10 hover:text-bear"
                                onClick={() => {
                                  setSelectedTicker(pos.ticker);
                                  setSellForm({
                                    quantity: String(pos.quantity),
                                    price: String(pos.currentPrice),
                                  });
                                  setSellOpen(true);
                                }}
                              >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() =>
                                  setLocation(`/stock/${pos.ticker}`)
                                }
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <PortfolioSectorChart positions={livePositions} />
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <HistoryIcon className="w-3 h-3" />
                  수익률 타임라인
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <PortfolioTimeline
                  snapHistory={snapHistory as any[]}
                  currentValue={totalValue}
                  currentInvested={totalInvested}
                />
              </CardContent>
            </Card>
            <SectorConcentrationAlert
              positions={livePositions}
              threshold={50}
            />
            <div className="grid grid-cols-1 gap-4">
              <PortfolioRiskAnalysis />
              <CorrelationMatrix />
            </div>
          </div>
        </div>

        {/* 매도 다이얼로그 */}
        <Dialog open={sellOpen} onOpenChange={setSellOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTicker} 매도 주문</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>매도 수량</Label>
                  <Input
                    type="number"
                    value={sellForm.quantity}
                    onChange={e =>
                      setSellForm({ ...sellForm, quantity: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>매도 가격</Label>
                  <Input
                    type="number"
                    value={sellForm.price}
                    onChange={e =>
                      setSellForm({ ...sellForm, price: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="p-3 bg-bear/5 rounded-lg border border-bear/10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">예상 매도 금액</span>
                  <span className="font-bold text-bear">
                    $
                    {(
                      Number(sellForm.quantity || 0) *
                      Number(sellForm.price || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
              <Button
                className="w-full bg-bear hover:bg-bear/90"
                onClick={handleSell}
                disabled={sellMutation.isPending}
              >
                매도 실행
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 기타 분석 컴포넌트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetAllocationAdvisor />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DividendCalendar />
            <TaxEstimator />
          </div>
        </div>
        <PortfolioStressTest />
      </div>
    </DashboardLayout>
  );
}
