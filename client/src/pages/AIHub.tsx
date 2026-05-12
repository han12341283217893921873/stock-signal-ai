import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  FileText,
  Swords,
  Search,
  Briefcase,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

// ─── 1. AI 포트폴리오 진단 ───────────────────────────────────────
function AIPortfolioOptimizer() {
  const { data, isLoading, error } = trpc.portfolio.aiAdvice.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );

  if (error || !data)
    return (
      <Card className="glass-card border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <BrainCircuit className="w-12 h-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">
              포트폴리오에 종목을 추가하면
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              AI가 실시간으로 진단하고 조언을 제공합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-primary">
            <BrainCircuit className="w-5 h-5" /> AI 포트폴리오 종합 진단
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-invert max-w-none text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {data.advice}
          </div>
          {data.analyzedAt && (
            <p className="text-[10px] text-muted-foreground/50 mt-4 text-right">
              분석 시각: {new Date(data.analyzedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 2. 실적 콜 요약 ────────────────────────────────────────────
function EarningsSummary() {
  const [tickerInput, setTickerInput] = useState("");
  const [ticker, setTicker] = useState("");
  const mutation = trpc.ai.earningsSummary.useMutation();

  const handleAnalyze = () => {
    const t = tickerInput.trim().toUpperCase();
    if (!t) return;
    setTicker(t);
    mutation.mutate({ ticker: t });
  };

  const data = mutation.data;
  const sentimentColor =
    data?.sentiment === "Positive"
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : data?.sentiment === "Negative"
        ? "bg-red-500/10 text-red-500 border-red-500/20"
        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Input
          placeholder="종목 코드 입력 (예: NVDA, AAPL)"
          className="max-w-xs font-mono uppercase"
          value={tickerInput}
          onChange={e => setTickerInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleAnalyze()}
        />
        <Button
          onClick={handleAnalyze}
          disabled={mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {mutation.isPending ? "분석 중..." : "AI 요약 생성"}
        </Button>
      </div>

      {mutation.isPending && <Skeleton className="h-64 w-full rounded-xl" />}

      {data && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{data.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  AI 분석 완료 ·{" "}
                  {new Date(data.analyzedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <Badge variant="outline" className={sentimentColor}>
                {data.sentiment}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                <h4 className="font-semibold text-green-500 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> 긍정적 요인 (Bullish)
                </h4>
                <ul className="space-y-2">
                  {data.bullishPoints?.map((pt: string, i: number) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex gap-2"
                    >
                      <span className="text-green-500 shrink-0">·</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                <h4 className="font-semibold text-red-500 mb-3 flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4" /> 우려 요인 (Bearish)
                </h4>
                <ul className="space-y-2">
                  {data.bearishPoints?.map((pt: string, i: number) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex gap-2"
                    >
                      <span className="text-red-500 shrink-0">·</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {data.guidance && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> 향후 가이던스
                  (Guidance)
                </h4>
                <p className="text-sm text-muted-foreground">{data.guidance}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mutation.error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-6 text-sm text-red-400">
            분석 중 오류가 발생했습니다. 올바른 티커를 입력했는지 확인하세요.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── 3. 종목 배틀 분석 ─────────────────────────────────────────
function PeerComparison() {
  const [tickerA, setTickerA] = useState("AAPL");
  const [tickerB, setTickerB] = useState("MSFT");
  const mutation = trpc.ai.peerComparison.useMutation();

  const handleCompare = () => {
    if (!tickerA || !tickerB) return;
    mutation.mutate({
      tickerA: tickerA.toUpperCase(),
      tickerB: tickerB.toUpperCase(),
    });
  };

  const gradeColor = (g: string) =>
    g === "Strong Buy"
      ? "bg-green-500/20 text-green-500"
      : g === "Buy"
        ? "bg-emerald-500/20 text-emerald-400"
        : g === "Hold"
          ? "bg-yellow-500/20 text-yellow-500"
          : "bg-red-500/20 text-red-500";

  const data = mutation.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="종목 A"
          className="max-w-[140px] font-mono uppercase"
          value={tickerA}
          onChange={e => setTickerA(e.target.value.toUpperCase())}
        />
        <span className="font-bold text-2xl text-muted-foreground">VS</span>
        <Input
          placeholder="종목 B"
          className="max-w-[140px] font-mono uppercase"
          value={tickerB}
          onChange={e => setTickerB(e.target.value.toUpperCase())}
        />
        <Button
          onClick={handleCompare}
          disabled={mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Swords className="w-4 h-4" />
          )}
          {mutation.isPending ? "분석 중..." : "비교 분석"}
        </Button>
      </div>

      {mutation.isPending && <Skeleton className="h-64 w-full rounded-xl" />}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-0 border rounded-xl overflow-hidden bg-card/50">
            <div className="p-4 border-r bg-muted/20 flex items-center font-semibold text-sm">
              비교 항목
            </div>
            <div
              className={`p-4 border-r text-center font-bold text-lg ${data.winner === data.tickerA ? "bg-primary/5" : ""}`}
            >
              {data.tickerA}{" "}
              {data.winner === data.tickerA && (
                <Trophy className="inline w-4 h-4 text-yellow-500 ml-1" />
              )}
            </div>
            <div
              className={`p-4 text-center font-bold text-lg ${data.winner === data.tickerB ? "bg-primary/5" : ""}`}
            >
              {data.tickerB}{" "}
              {data.winner === data.tickerB && (
                <Trophy className="inline w-4 h-4 text-yellow-500 ml-1" />
              )}
            </div>

            <div className="p-4 border-t border-r bg-muted/20 font-medium text-sm">
              AI 투자 등급
            </div>
            <div className="p-4 border-t border-r text-center">
              <Badge className={`${gradeColor(data.gradeA)} border-none`}>
                {data.gradeA}
              </Badge>
            </div>
            <div className="p-4 border-t text-center">
              <Badge className={`${gradeColor(data.gradeB)} border-none`}>
                {data.gradeB}
              </Badge>
            </div>

            <div className="p-4 border-t border-r bg-muted/20 font-medium text-sm">
              현재가
            </div>
            <div className="p-4 border-t border-r text-center font-mono text-sm">
              ${data.priceA?.toLocaleString()}
            </div>
            <div className="p-4 border-t text-center font-mono text-sm">
              ${data.priceB?.toLocaleString()}
            </div>

            <div className="p-4 border-t border-r bg-muted/20 font-medium text-sm">
              RSI 해석
            </div>
            <div className="p-4 border-t border-r text-center text-xs text-muted-foreground">
              {data.rsiA}
            </div>
            <div className="p-4 border-t text-center text-xs text-muted-foreground">
              {data.rsiB}
            </div>

            <div className="p-4 border-t border-r bg-muted/20 font-medium text-sm">
              성장 모멘텀
            </div>
            <div className="p-4 border-t border-r text-sm text-muted-foreground">
              {data.momentumA}
            </div>
            <div className="p-4 border-t text-sm text-muted-foreground">
              {data.momentumB}
            </div>

            <div className="p-4 border-t border-r bg-muted/20 font-medium text-sm">
              AI 종합 평가
            </div>
            <div className="p-4 border-t col-span-2 text-sm text-muted-foreground">
              {data.conclusion}
            </div>
          </div>
        </div>
      )}

      {mutation.error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-6 text-sm text-red-400">
            비교 분석 중 오류가 발생했습니다.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── 4. AI 테마 발굴 ────────────────────────────────────────────
function AIThemeDiscovery() {
  const { data, isLoading, refetch, isFetching } =
    trpc.ai.themeDiscovery.useQuery(undefined, {
      staleTime: 30 * 60 * 1000,
    });

  if (isLoading)
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          실시간 시장 데이터 기반으로 핫한 테마를 발굴합니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />{" "}
          새로고침
        </Button>
      </div>
      {data?.themes && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.themes.slice(0, 5).map((theme: any, i: number) => (
            <Card
              key={i}
              className="glass-card hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center mb-2">
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary text-[10px]"
                  >
                    #{i + 1} Theme
                  </Badge>
                  <div
                    className={`flex items-center gap-1 text-sm font-bold ${theme.isPositive ? "text-green-500" : "text-red-500"}`}
                  >
                    {theme.isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {theme.trend}
                  </div>
                </div>
                <CardTitle className="text-base">{theme.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                  <div
                    className={`h-1.5 rounded-full transition-all ${theme.isPositive ? "bg-primary" : "bg-red-500"}`}
                    style={{ width: `${theme.hotness}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {theme.stocks?.map((s: string) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {data?.analysis && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-5">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" /> AI 테마 분석:{" "}
              {data.featuredTheme}
            </h4>
            <p className="text-sm text-muted-foreground">{data.analysis}</p>
            {data.updatedAt && (
              <p className="text-[10px] text-muted-foreground/50 mt-3">
                업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── 5. 소셜 감성 추적 ─────────────────────────────────────────
function SocialSentimentTracker() {
  const [tickerInput, setTickerInput] = useState("");
  const mutation = trpc.ai.socialSentiment.useMutation();

  const handleScan = () => {
    if (tickerInput) mutation.mutate({ ticker: tickerInput.toUpperCase() });
  };

  const data = mutation.data;
  const sentColor =
    data?.sentiment === "Positive"
      ? "text-green-500"
      : data?.sentiment === "Negative"
        ? "text-red-500"
        : "text-yellow-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Input
          placeholder="종목 코드 (예: TSLA)"
          className="max-w-xs font-mono uppercase"
          value={tickerInput}
          onChange={e => setTickerInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleScan()}
        />
        <Button
          onClick={handleScan}
          disabled={mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {mutation.isPending ? "스캔 중..." : "소셜 감성 스캔"}
        </Button>
      </div>

      {mutation.isPending && <Skeleton className="h-48 w-full rounded-xl" />}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{data.ticker} 소셜 버즈</span>
                <Badge
                  variant="outline"
                  className={`${sentColor} border-current`}
                >
                  {data.sentiment}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Buzz Intensity</span>
                  <span className="font-mono font-bold">
                    {data.buzzScore}/100
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${data.buzzScore}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50 leading-relaxed">
                "{data.summary}"
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.trendingKeywords?.map((kw: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    #{kw}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">분석 기반</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                실시간 뉴스 헤드라인과 주가 흐름 데이터를 LLM이 분석하여 소셜
                미디어(X, Reddit 등)의 전반적인 시장 심리를 추정합니다.
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-3">
                분석 시각: {new Date(data.analyzedAt).toLocaleString("ko-KR")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── 6. 스마트 머니 (실제 내부자 매매) ──────────────────────────
function SmartMoneyTracker() {
  const { data, isLoading, refetch, isFetching } =
    trpc.ai.smartMoneyTracker.useQuery(undefined, {
      staleTime: 60 * 60 * 1000,
    });

  if (isLoading)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );

  const formatValue = (v: number) =>
    v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(1)}M`
      : `$${(v / 1_000).toFixed(0)}K`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          SEC Form 4 기반 실제 내부자 대규모 매매 추적
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />{" "}
          새로고침
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-green-500" /> 대규모 내부자
              매수
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.bigBuys?.length ? (
              <p className="text-sm text-muted-foreground">
                최근 대규모 매수 없음
              </p>
            ) : (
              data.bigBuys.map((t: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 rounded-lg bg-card border"
                >
                  <div>
                    <h4 className="font-bold font-mono">{t.ticker}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t.name} · {t.shares?.toLocaleString()}주
                    </p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                  <p className="font-bold text-green-500">
                    +{formatValue(t.value)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-red-500" /> 대규모 내부자/기관
              매도
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data?.bigSells?.length ? (
              <p className="text-sm text-muted-foreground">
                최근 대규모 매도 없음
              </p>
            ) : (
              data.bigSells.map((t: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 rounded-lg bg-card border"
                >
                  <div>
                    <h4 className="font-bold font-mono">{t.ticker}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t.name} · {t.shares?.toLocaleString()}주
                    </p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                  <p className="font-bold text-red-500">
                    -{formatValue(t.value)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      {data?.updatedAt && (
        <p className="text-[10px] text-muted-foreground/50 text-right">
          마지막 업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function AIHub() {
  const [activeTab, setActiveTab] = useState("portfolio");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-primary" />
            AI 분석 허브 (Pro)
          </h1>
          <p className="text-muted-foreground mt-2">
            실시간 시장 데이터 + LLM 기반 심층 투자 분석 도구입니다.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start h-auto flex-wrap bg-card border rounded-lg p-1 mb-6">
            <TabsTrigger value="portfolio" className="py-2.5">
              1. AI 포트폴리오 진단
            </TabsTrigger>
            <TabsTrigger value="earnings" className="py-2.5">
              2. 실적 콜 요약
            </TabsTrigger>
            <TabsTrigger value="peer" className="py-2.5">
              3. 종목 배틀 분석
            </TabsTrigger>
            <TabsTrigger value="themes" className="py-2.5">
              4. AI 테마 발굴
            </TabsTrigger>
            <TabsTrigger value="social" className="py-2.5">
              5. 소셜 감성 추적
            </TabsTrigger>
            <TabsTrigger value="smartmoney" className="py-2.5">
              6. 스마트 머니
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="portfolio"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <AIPortfolioOptimizer />
          </TabsContent>
          <TabsContent
            value="earnings"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <EarningsSummary />
          </TabsContent>
          <TabsContent
            value="peer"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <PeerComparison />
          </TabsContent>
          <TabsContent
            value="themes"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <AIThemeDiscovery />
          </TabsContent>
          <TabsContent
            value="social"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <SocialSentimentTracker />
          </TabsContent>
          <TabsContent
            value="smartmoney"
            className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <SmartMoneyTracker />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
