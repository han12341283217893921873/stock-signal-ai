import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { LayoutDashboard, Info, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AssetAllocationAdvisor() {
  const { data: allocation, isLoading } =
    trpc.portfolio.assetAllocation.useQuery();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!allocation) return null;

  return (
    <Card className="glass-card border-bull/20 bg-bull/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-bull">
          <LayoutDashboard className="h-4 w-4" />
          AI 자산 배분 제안 (All-Weather)
          <Badge className="ml-auto bg-bull/20 text-bull border-none text-[10px]">
            {allocation.marketPhase}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-[180px] w-full md:w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation.weights}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="weight"
                >
                  {allocation.weights.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(val: number) => [`${val}%`, "비중"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {allocation.weights.map((w: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: w.color }}
                  />
                  <span className="text-xs font-bold">{w.asset}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {w.weight}%
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-bull/20 space-y-2">
              <div className="flex items-center gap-2 text-bull">
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase">
                  AI Insight
                </span>
              </div>
              <p className="text-xs leading-relaxed italic">
                "{allocation.reason}"
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-bull/10 flex items-start gap-2">
          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[9px] text-muted-foreground">
            이 제안은 '사계절 포트폴리오(All-Weather)' 철학을 바탕으로 AI가 현재
            매크로 지표를 해석한 결과입니다. 개인의 투자 성향에 따라 비중을
            조절하세요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
