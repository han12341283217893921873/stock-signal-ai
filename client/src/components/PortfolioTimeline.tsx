import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Snapshot {
  id?: number;
  date?: string; // Optional fallback
  snapshotDate?: string; // Actual DB field: YYYY-MM-DD
  createdAt?: string | Date; // Actual DB field: Date object
  totalValue: number;
  totalInvested: number;
  pnlPercent: number;
}

interface PortfolioTimelineProps {
  snapHistory: Snapshot[];
  currentValue: number;
  currentInvested: number;
}

function formatKSTDate(raw: string | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  const isProfit = (data?.pnlPercent ?? 0) >= 0;
  return (
    <div className="glass-card px-3 py-2.5 rounded-xl shadow-xl text-xs min-w-[150px]">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">평가금액</span>
          <span className="font-mono font-bold">
            $
            {(data?.totalValue ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">투자금액</span>
          <span className="font-mono">
            $
            {(data?.totalInvested ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border/30">
          <span className="text-muted-foreground">수익률</span>
          <span
            className={`font-mono font-bold ${isProfit ? "text-bull" : "text-bear"}`}
          >
            {isProfit ? "+" : ""}
            {(data?.pnlPercent ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function PortfolioTimeline({
  snapHistory,
  currentValue,
  currentInvested,
}: PortfolioTimelineProps) {
  const chartData = useMemo(() => {
    // 최근 30일 기준, 하루 1개 스냅샷
    const byDay = new Map<string, Snapshot>();
    snapHistory.forEach(s => {
      // 1. snapshotDate(string) 우선, 없으면 createdAt(Date)에서 추출
      let key = "";
      if (s.snapshotDate) {
        key = s.snapshotDate.slice(0, 10);
      } else if (s.date) {
        key = s.date.slice(0, 10);
      } else if (s.createdAt) {
        const d = new Date(s.createdAt);
        if (!isNaN(d.getTime())) {
          key = d.toISOString().slice(0, 10);
        }
      }

      if (!key) return;

      const currentCreatedAt = s.createdAt
        ? new Date(s.createdAt).getTime()
        : 0;
      const existing = byDay.get(key);
      const existingCreatedAt = existing?.createdAt
        ? new Date(existing.createdAt).getTime()
        : 0;

      if (!existing || currentCreatedAt > existingCreatedAt) {
        byDay.set(key, s);
      }
    });

    const sorted = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([dateStr, s]) => {
        const d = new Date(dateStr + "T00:00:00");
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return {
          label,
          totalValue: Math.round(s.totalValue * 100) / 100,
          totalInvested: Math.round(s.totalInvested * 100) / 100,
          pnlPercent: Math.round(s.pnlPercent * 100) / 100,
        };
      });

    return sorted;
  }, [snapHistory]);

  const hasData = chartData.length >= 2;
  const firstValue = chartData[0]?.totalValue ?? 0;
  const lastValue = chartData[chartData.length - 1]?.totalValue ?? currentValue;
  const overallChange =
    firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  const isProfit = overallChange >= 0;

  const minVal = hasData
    ? Math.min(...chartData.map(d => d.totalValue)) * 0.98
    : 0;
  const maxVal = hasData
    ? Math.max(...chartData.map(d => d.totalValue)) * 1.02
    : 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Activity className="w-10 h-10 text-muted-foreground/30" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            아직 데이터가 없습니다
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            포트폴리오를 보유하면 매일 자동으로 수익률 이력이 쌓입니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 요약 스탯 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            {chartData.length}일 수익률 추이
          </p>
          <div className={`flex items-center gap-1.5 mt-0.5`}>
            {isProfit ? (
              <TrendingUp className="w-4 h-4 text-bull" />
            ) : (
              <TrendingDown className="w-4 h-4 text-bear" />
            )}
            <span
              className={`text-xl font-black ${isProfit ? "text-bull" : "text-bear"}`}
            >
              {isProfit ? "+" : ""}
              {overallChange.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              ({chartData[0]?.label} → {chartData[chartData.length - 1]?.label})
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">현재 평가금액</p>
          <p className="text-lg font-black font-mono">
            $
            {currentValue.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
      </div>

      {/* 차트 */}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={
                    isProfit ? "oklch(0.70 0.20 158)" : "oklch(0.62 0.23 22)"
                  }
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={
                    isProfit ? "oklch(0.70 0.20 158)" : "oklch(0.62 0.23 22)"
                  }
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.62 0.22 254)"
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.62 0.22 254)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.24 0.014 260 / 50%)"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "oklch(0.50 0.016 260)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minVal, maxVal]}
              tick={{ fontSize: 10, fill: "oklch(0.50 0.016 260)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="totalInvested"
              name="투자금액"
              stroke="oklch(0.62 0.22 254 / 60%)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill="url(#investedGrad)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="totalValue"
              name="평가금액"
              stroke={isProfit ? "oklch(0.70 0.20 158)" : "oklch(0.62 0.23 22)"}
              strokeWidth={2.5}
              fill="url(#portfolioGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-0.5 rounded-full"
            style={{
              background: isProfit
                ? "oklch(0.70 0.20 158)"
                : "oklch(0.62 0.23 22)",
            }}
          />
          <span>평가금액</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-px"
            style={{
              background: "oklch(0.62 0.22 254 / 60%)",
              borderTop: "1px dashed",
            }}
          />
          <span>투자금액</span>
        </div>
      </div>
    </div>
  );
}
