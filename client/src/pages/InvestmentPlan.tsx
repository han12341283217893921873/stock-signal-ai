import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  BrainCircuit,
  Loader2,
  TrendingUp,
  Shield,
  Clock,
  DollarSign,
} from "lucide-react";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#6366f1",
  "#22d3ee",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

export default function InvestmentPlan() {
  const [riskTolerance, setRiskTolerance] = useState<
    "conservative" | "moderate" | "aggressive"
  >("moderate");
  const [investmentGoal, setInvestmentGoal] = useState<
    "growth" | "income" | "preservation" | "balanced"
  >("growth");
  const [timeHorizon, setTimeHorizon] = useState<"short" | "mid" | "long">(
    "long"
  );
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const mutation = trpc.insights.investmentPlan.useMutation();

  const generate = () => {
    mutation.mutate({
      riskTolerance,
      investmentGoal,
      timeHorizon,
      monthlyBudget: monthlyBudget ? Number(monthlyBudget) : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-primary" /> AI 투자 플랜
            생성기
          </h1>
          <p className="text-muted-foreground mt-2">
            투자 성향 설문을 바탕으로 AI가 맞춤 포트폴리오 구성안을 제시합니다.
          </p>
        </div>

        {/* 설문 카드 */}
        <Card className="glass-card max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">투자자 프로필 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>위험 성향</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    v: "conservative",
                    label: "보수형",
                    icon: "🛡️",
                    desc: "원금 보존 우선",
                  },
                  {
                    v: "moderate",
                    label: "균형형",
                    icon: "⚖️",
                    desc: "위험·수익 균형",
                  },
                  {
                    v: "aggressive",
                    label: "공격형",
                    icon: "🚀",
                    desc: "고수익 추구",
                  },
                ].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setRiskTolerance(opt.v as any)}
                    className={`p-3 rounded-xl border text-center transition-all ${riskTolerance === opt.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="text-xl">{opt.icon}</div>
                    <div className="text-xs font-bold mt-1">{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>투자 목표</Label>
              <Select
                value={investmentGoal}
                onValueChange={v => setInvestmentGoal(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">
                    📈 성장주 중심 (자본이득)
                  </SelectItem>
                  <SelectItem value="income">
                    💰 배당/인컴 (정기 수입)
                  </SelectItem>
                  <SelectItem value="preservation">
                    🏦 자산 보존 (인플레 방어)
                  </SelectItem>
                  <SelectItem value="balanced">⚖️ 균형 포트폴리오</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>투자 기간</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "short", label: "단기", desc: "1년 이내" },
                  { v: "mid", label: "중기", desc: "1-5년" },
                  { v: "long", label: "장기", desc: "5년+" },
                ].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setTimeHorizon(opt.v as any)}
                    className={`p-3 rounded-xl border text-center transition-all ${timeHorizon === opt.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>월 투자 예산 (선택, USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  value={monthlyBudget}
                  onChange={e => setMonthlyBudget(e.target.value)}
                  placeholder="500"
                  className="pl-8"
                  type="number"
                />
              </div>
            </div>
            <Button
              onClick={generate}
              disabled={mutation.isPending}
              className="w-full gap-2"
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BrainCircuit className="w-4 h-4" />
              )}
              {mutation.isPending ? "AI 분석 중..." : "맞춤 투자 플랜 생성"}
            </Button>
          </CardContent>
        </Card>

        {/* 결과 */}
        {mutation.data && !mutation.isPending && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="glass-card border-primary/20">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold mb-1">AI 투자 플랜 요약</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {mutation.data.summary}
                    </p>
                    {mutation.data.monthlyAction && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs font-bold text-primary">
                          이번 달 액션 플랜
                        </p>
                        <p className="text-sm mt-1">
                          {mutation.data.monthlyAction}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 자산 배분 */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">추천 자산 배분</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={mutation.data.allocation || []}
                          dataKey="pct"
                          nameKey="asset"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                        >
                          {(mutation.data.allocation || []).map(
                            (_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            )
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [`${v}%`]}
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 10,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {(mutation.data.allocation || []).map(
                        (a: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ background: COLORS[i % COLORS.length] }}
                            />
                            <span className="text-muted-foreground flex-1 truncate">
                              {a.asset}
                            </span>
                            <span className="font-bold">{a.pct}%</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 추천 종목 */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">추천 종목</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(mutation.data.recommendedStocks || [])
                      .slice(0, 5)
                      .map((s: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-2 rounded-lg bg-muted/30"
                        >
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] shrink-0"
                          >
                            {s.ticker}
                          </Badge>
                          <div>
                            <p className="text-xs font-bold">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {s.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    {!mutation.data.recommendedStocks?.length && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        추천 종목 없음
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 리스크 & 리밸런싱 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-500" /> 주요 리스크
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {(mutation.data.risks || []).map((r: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-red-500">▸</span> {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> 리밸런싱 주기
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {mutation.data.rebalanceFrequency || "분기별 검토 권장"}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    생성:{" "}
                    {new Date(mutation.data.generatedAt).toLocaleString(
                      "ko-KR"
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
