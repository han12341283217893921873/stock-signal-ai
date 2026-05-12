import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCheck,
  Clock,
  Eye,
  Target,
  Trophy,
  PieChart,
  Bell,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function SignalHistory() {
  const [, setLocation] = useLocation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: signals, isLoading } = trpc.signals.list.useQuery({
    limit: 100,
  });

  const { data: stats, isLoading: statsLoading } = trpc.signalPerformance.stats.useQuery(undefined, {
    staleTime: 60000,
  });

  const utils = trpc.useUtils();

  const markReadMutation = trpc.signals.markRead.useMutation({
    onSuccess: () => {
      utils.signals.list.invalidate();
      utils.signals.unreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.signals.markAllRead.useMutation({
    onSuccess: () => {
      utils.signals.list.invalidate();
      utils.signals.unreadCount.invalidate();
      toast.success("모든 알림을 읽음 처리했습니다");
    },
  });

  const getSignalIcon = (type: string) => {
    switch (type) {
      case "buy":
        return <TrendingUp className="h-4 w-4 text-bull" />;
      case "sell":
        return <TrendingDown className="h-4 w-4 text-bear" />;
      default:
        return <Minus className="h-4 w-4 text-neutral-signal" />;
    }
  };

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

  const unreadCount = signals?.filter(s => s.isRead === 0).length ?? 0;

  // 신호 강도 시계열 데이터
  const chartData = useMemo(() => {
    if (!signals) return [];
    return [...signals]
      .reverse()
      .slice(-30)
      .map(s => ({
        date: new Date(s.createdAt).toLocaleDateString("ko-KR", {
          month: "numeric",
          day: "numeric",
        }),
        strength: s.strength ?? 0,
        type: s.signalType,
      }));
  }, [signals]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                신호 히스토리
              </h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="font-bold">
                  {unreadCount} 새 알림
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              AI가 생성한 매매 신호와 분석 기록을 확인하세요
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              모두 읽음
            </Button>
          )}
        </div>

        {/* AI 적중률 (Hit Rate) 대시보드 */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="glass-card">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Target className="w-4 h-4 text-primary" />
                    AI 평균 적중률 (승률)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-primary">
                      {stats.winRate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      최근 30일 기준
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    수익 마감 / 전체 신호
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-emerald-400">
                      {stats.winningSignals}
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      / {stats.totalClosed} 건
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <BarChart2 className="w-4 h-4 text-sky-400" />
                    평균 수익률 (건당)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black font-mono ${stats.averageProfitPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {stats.averageProfitPercent >= 0 ? "+" : ""}{stats.averageProfitPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.averageProfitPercent >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <TrendingUp className={`w-6 h-6 ${stats.averageProfitPercent >= 0 ? "text-emerald-400" : "text-red-400"}`} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 신호 강도 차트 */}
        {chartData.length >= 3 && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                신호 강도 추이 (최근 30개)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="sigGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(99,102,241,0.1)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    formatter={(v: number) => [v, "강도"]}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="strength"
                    stroke="#6366f1"
                    fill="url(#sigGrad)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Signal List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="glass-card">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : signals && signals.length > 0 ? (
          <div className="space-y-3">
            {signals.map(signal => (
              <Card
                key={signal.id}
                className={`glass-card transition-all cursor-pointer hover:border-primary/20 ${
                  signal.isRead === 0 ? "border-l-2 border-l-primary" : ""
                }`}
                onClick={() => {
                  if (signal.isRead === 0) {
                    markReadMutation.mutate({ signalId: signal.id });
                  }
                  setExpandedId(expandedId === signal.id ? null : signal.id);
                }}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        signal.signalType === "buy"
                          ? "bg-bull/15"
                          : signal.signalType === "sell"
                            ? "bg-bear/15"
                            : "bg-neutral-signal/15"
                      }`}
                    >
                      {getSignalIcon(signal.signalType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            setLocation(`/stock/${signal.ticker}`);
                          }}
                        >
                          {signal.ticker}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${getSignalBg(signal.signalType)}`}
                        >
                          {getSignalLabel(signal.signalType)}
                        </Badge>
                        {signal.strength != null && (
                          <span className="text-[10px] text-muted-foreground">
                            강도 {signal.strength}
                          </span>
                        )}
                        {signal.isRead === 0 && (
                          <span className="h-2 w-2 rounded-full bg-primary signal-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(signal.createdAt).toLocaleString("ko-KR")}
                        </span>
                        {signal.price && (
                          <span className="font-mono">${signal.price}</span>
                        )}
                        {signal.rsi && (
                          <span className="font-mono">
                            RSI {Number(signal.rsi).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground/50" />
                  </div>

                  {/* Expanded content */}
                  {expandedId === signal.id && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                      {signal.reason && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            신호 근거
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {signal.reason}
                          </p>
                        </div>
                      )}
                      {signal.aiComment && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            AI 분석 코멘트
                          </p>
                          <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
                            <Streamdown>{signal.aiComment}</Streamdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                아직 신호 기록이 없습니다
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                종목 상세 페이지에서 "AI 분석" 버튼을 클릭하면 매매 신호가
                자동으로 생성되고 여기에 기록됩니다.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
