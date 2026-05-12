import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#22d3ee",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

export default function RebalancingTool() {
  const { data: portfolioData, isLoading } = trpc.portfolio.list.useQuery();
  const positions = portfolioData?.positions ?? [];
  const [targets, setTargets] = useState<
    { ticker: string; targetPct: number }[]
  >([]);
  const [initialized, setInitialized] = useState(false);

  const mutation = trpc.insights.rebalancing.useMutation();

  // 포트폴리오에서 자동 초기화
  const initFromPortfolio = () => {
    if (!positions.length) return;
    const totalValue = positions.reduce((s, p) => s + (p.totalValue ?? 0), 0);
    const initial = positions.map(p => ({
      ticker: p.ticker,
      targetPct:
        totalValue > 0
          ? Number((((p.totalValue ?? 0) / totalValue) * 100).toFixed(1))
          : 0,
    }));
    setTargets(initial);
    setInitialized(true);
  };

  const addRow = () =>
    setTargets(prev => [...prev, { ticker: "", targetPct: 0 }]);
  const removeRow = (i: number) =>
    setTargets(prev => prev.filter((_, idx) => idx !== i));
  const update = (
    i: number,
    field: "ticker" | "targetPct",
    val: string | number
  ) =>
    setTargets(prev =>
      prev.map((t, idx) => (idx === i ? { ...t, [field]: val } : t))
    );
  const totalPct = targets.reduce((s, t) => s + t.targetPct, 0);

  const analyze = async () => {
    if (totalPct > 101 || totalPct < 99) {
      toast.error(
        `비중 합계가 ${totalPct.toFixed(1)}%입니다. 100%로 맞춰주세요.`
      );
      return;
    }
    const valid = targets.filter(t => t.ticker && t.targetPct > 0);
    if (!valid.length) {
      toast.error("유효한 종목을 입력해주세요.");
      return;
    }
    mutation.mutate({ targets: valid });
  };

  const actionColors = {
    BUY: "text-green-500",
    SELL: "text-red-500",
    HOLD: "text-muted-foreground",
  };
  const actionBg = {
    BUY: "bg-green-500/10 border-green-500/20",
    SELL: "bg-red-500/10 border-red-500/20",
    HOLD: "bg-muted/30 border-border",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" /> 포트폴리오 리밸런싱
          </h1>
          <p className="text-muted-foreground mt-2">
            목표 비중을 설정하고 필요한 매수/매도 수량을 자동 계산합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 목표 비중 설정 */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">목표 비중 설정</CardTitle>
              <div className="flex gap-2">
                {!initialized && positions.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={initFromPortfolio}
                  >
                    현재 포트폴리오로 초기화
                  </Button>
                )}
                <Button size="sm" onClick={addRow} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> 종목 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <Skeleton className="h-40" />
              ) : (
                <>
                  {targets.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={t.ticker}
                        onChange={e =>
                          update(i, "ticker", e.target.value.toUpperCase())
                        }
                        placeholder="AAPL"
                        className="w-28 font-mono text-sm h-8"
                      />
                      <Input
                        type="number"
                        value={t.targetPct}
                        onChange={e =>
                          update(i, "targetPct", Number(e.target.value))
                        }
                        min={0}
                        max={100}
                        step={0.5}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(t.targetPct, 100)}%` }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeRow(i)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {targets.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      "현재 포트폴리오로 초기화" 또는 수동으로 종목을
                      추가하세요.
                    </p>
                  )}
                  <div
                    className={`flex justify-between items-center pt-3 border-t border-border/50 ${Math.abs(totalPct - 100) > 1 ? "text-red-500" : "text-green-500"}`}
                  >
                    <span className="text-sm font-medium">비중 합계</span>
                    <span className="font-bold font-mono">
                      {totalPct.toFixed(1)}%
                    </span>
                  </div>
                  <Button
                    onClick={analyze}
                    disabled={mutation.isPending || targets.length === 0}
                    className="w-full gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    {mutation.isPending ? "분석 중..." : "리밸런싱 계산"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* 시각화 */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">목표 배분 시각화</CardTitle>
            </CardHeader>
            <CardContent>
              {targets.filter(t => t.ticker && t.targetPct > 0).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={targets.filter(t => t.ticker && t.targetPct > 0)}
                      dataKey="targetPct"
                      nameKey="ticker"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ ticker, targetPct }) =>
                        `${ticker} ${targetPct}%`
                      }
                      labelLine={false}
                    >
                      {targets
                        .filter(t => t.ticker)
                        .map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [
                        `${v.toFixed(1)}%`,
                        "목표 비중",
                      ]}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                  종목을 추가하면 차트가 표시됩니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 분석 결과 */}
        {mutation.data && (
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">리밸런싱 액션 플랜</CardTitle>
                <Badge variant="outline">
                  총 자산 $
                  {mutation.data.totalValue.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mutation.data.actions.map((act: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-3 rounded-xl border ${actionBg[act.action as keyof typeof actionBg]}`}
                  >
                    <div className="font-mono font-bold w-16">{act.ticker}</div>
                    <Badge
                      className={`${act.action === "BUY" ? "bg-green-500" : act.action === "SELL" ? "bg-red-500" : "bg-muted"} text-white border-none w-14 justify-center`}
                    >
                      {act.action === "BUY"
                        ? "매수"
                        : act.action === "SELL"
                          ? "매도"
                          : "유지"}
                    </Badge>
                    {act.action !== "HOLD" && (
                      <span
                        className={`font-bold ${actionColors[act.action as keyof typeof actionColors]}`}
                      >
                        {act.shares}주 ({act.action === "BUY" ? "+" : "-"}$
                        {Math.abs(act.diff).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                        )
                      </span>
                    )}
                    <div className="flex-1 text-right text-sm text-muted-foreground">
                      현재 {act.currentPct.toFixed(1)}% → 목표{" "}
                      {act.targetPct.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
