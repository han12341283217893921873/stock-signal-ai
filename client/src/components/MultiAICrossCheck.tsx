import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, ShieldCheck, Zap, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MultiAICrossCheckProps {
  ticker: string;
  marketContext: string;
}

export default function MultiAICrossCheck({
  ticker,
  marketContext,
}: MultiAICrossCheckProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const crossCheckMutation = trpc.ai.crossCheck.useMutation();

  const handleStart = () => {
    setHasStarted(true);
    crossCheckMutation.mutate({ ticker, marketContext });
  };

  if (!hasStarted) {
    return (
      <Card className="glass-card border-dashed border-primary/30">
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="flex -space-x-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-background flex items-center justify-center">
              <span className="text-[10px] font-bold">G</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-500/20 border-2 border-background flex items-center justify-center">
              <span className="text-[10px] font-bold">C</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-background flex items-center justify-center">
              <span className="text-[10px] font-bold">D</span>
            </div>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-bold">멀티 AI 교차 검증</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Gemini, Claude, DeepSeek의 의견을 동시에 확인하세요.
            </p>
          </div>
          <Button onClick={handleStart} size="sm" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            검증 시작하기
          </Button>
        </CardContent>
      </Card>
    );
  }

  const results = crossCheckMutation.data;
  const isLoading = crossCheckMutation.isPending;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          AI 모델별 통합 인사이트
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : results ? (
          <Tabs defaultValue="gemini" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/30">
              <TabsTrigger
                value="gemini"
                className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400"
              >
                Gemini
              </TabsTrigger>
              <TabsTrigger
                value="anthropic"
                className="text-xs data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400"
              >
                Claude
              </TabsTrigger>
              <TabsTrigger
                value="deepseek"
                className="text-xs data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
              >
                DeepSeek
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 min-h-[120px]">
              {Object.entries(results).map(([engine, content]) => (
                <TabsContent
                  key={engine}
                  value={engine}
                  className="animate-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 p-1 rounded-md ${
                        engine === "gemini"
                          ? "bg-blue-500/10 text-blue-400"
                          : engine === "anthropic"
                            ? "bg-orange-500/10 text-orange-400"
                            : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                    </div>
                    <p className="text-[12px] leading-relaxed text-foreground/90 italic">
                      "{content}"
                    </p>
                  </div>
                </TabsContent>
              ))}
            </div>

            <Alert className="mt-4 bg-primary/5 border-primary/20 py-2">
              <Info className="h-3 w-3 text-primary" />
              <AlertDescription className="text-[10px] text-muted-foreground">
                서로 다른 알고리즘을 가진 AI들이 동일한 결론을 내릴수록 신호의
                신뢰도가 높습니다.
              </AlertDescription>
            </Alert>
          </Tabs>
        ) : (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              데이터를 가져오지 못했습니다.
            </p>
            <Button variant="link" size="sm" onClick={handleStart}>
              다시 시도
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
