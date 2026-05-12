import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";

interface SectorData {
  name: string;
  value: number;
}

interface PortfolioSectorChartProps {
  positions: any[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

export default function PortfolioSectorChart({
  positions,
}: PortfolioSectorChartProps) {
  const sectorData = useMemo(() => {
    const sectors: Record<string, number> = {};
    let totalValue = 0;

    positions.forEach(p => {
      const sector = p.sector || "기타";
      const value = p.totalValue || 0;
      sectors[sector] = (sectors[sector] || 0) + value;
      totalValue += value;
    });

    if (totalValue === 0) return [];

    return Object.entries(sectors)
      .map(([name, value]) => ({
        name,
        value: Number(((value / totalValue) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions]);

  if (positions.length === 0 || sectorData.length === 0) {
    return (
      <Card className="bg-card border-border h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
            섹터 비중
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[240px] flex items-center justify-center text-muted-foreground text-xs">
          데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          섹터 비중
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[260px] p-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sectorData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {sectorData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: number) => [`${value}%`, "비중"]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
